import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../db/db.module';
import { GlobalConfigRepository } from '../config/config.repository';
import { AnbimaImaB5Client } from './anbima-ima-b5.client';
import { AnbimaJobError, AnbimaPersistenceError } from './anbima-ima-b5.errors';
import { AnbimaImaB5Parser } from './anbima-ima-b5.parser';
import { IMA_B5_LOCK_KEY, ImanB5RunResult } from './anbima-ima-b5.types';

@Injectable()
export class AnbimaImaB5Service {
  private readonly logger = new Logger(AnbimaImaB5Service.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly client: AnbimaImaB5Client,
    private readonly parser: AnbimaImaB5Parser,
    private readonly repository: GlobalConfigRepository,
  ) {}

  async runOnce(executionId: string = randomUUID(), attempt = 1): Promise<ImanB5RunResult> {
    const startedAt = Date.now();
    let filePath: string | undefined;
    let locked = false;
    this.logger.log({ event: 'anbima_ima_b5_started', executionId, attempt });

    try {
      locked = await this.tryLock();
      if (!locked) {
        this.logger.log({ event: 'anbima_ima_b5_skipped', executionId, attempt, reason: 'lock_not_acquired' });
        return { status: 'skipped', executionId, reason: 'lock_not_acquired' };
      }

      const downloaded = await this.client.download(executionId, attempt);
      filePath = downloaded.filePath;
      const parsed = this.parser.parse(filePath);
      await this.persist(parsed.rate);
      this.logger.log({
        event: 'anbima_ima_b5_persisted',
        executionId,
        attempt,
        referenceDate: parsed.referenceDate,
        rate: parsed.rate,
      });
      return { status: 'success', executionId, referenceDate: parsed.referenceDate, rate: parsed.rate };
    } finally {
      if (filePath) {
        await this.cleanup(filePath, executionId, attempt);
      }
      if (locked) {
        await this.unlock();
      }
      this.logger.log({ event: 'anbima_ima_b5_finished', executionId, attempt, durationMs: Date.now() - startedAt });
    }
  }

  isTransientError(error: unknown): boolean {
    return error instanceof AnbimaJobError && error.transient;
  }

  private async persist(rate: string): Promise<void> {
    try {
      await this.repository.upsertImaBRate(rate);
    } catch (error) {
      throw new AnbimaPersistenceError('Could not persist IMA-B 5 rate', false, error);
    }
  }

  private async tryLock(): Promise<boolean> {
    const result = await this.pool.query<{ locked: boolean }>('SELECT pg_try_advisory_lock($1) AS locked', [IMA_B5_LOCK_KEY]);
    return result.rows[0]?.locked === true;
  }

  private async unlock(): Promise<void> {
    await this.pool.query('SELECT pg_advisory_unlock($1)', [IMA_B5_LOCK_KEY]).catch((error) => {
      this.logger.error({ event: 'anbima_ima_b5_lock_release_failed', error: String(error) });
    });
  }

  private async cleanup(filePath: string, executionId: string, attempt: number): Promise<void> {
    try {
      await fs.rm(filePath, { force: true });
      this.logger.log({ event: 'anbima_ima_b5_cleanup_ok', executionId, attempt, filePath });
    } catch (error) {
      this.logger.error({ event: 'anbima_ima_b5_cleanup_failed', executionId, attempt, filePath, error: String(error) });
    }
  }
}
