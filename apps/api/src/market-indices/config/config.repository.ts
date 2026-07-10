import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../db/db.module';

@Injectable()
export class GlobalConfigRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async upsertImaBRate(rate: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO config (id, taxa_ima_b)
         VALUES (1, $1::numeric)
         ON CONFLICT (id)
         DO UPDATE SET taxa_ima_b = EXCLUDED.taxa_ima_b`,
        [rate],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
