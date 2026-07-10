import { randomUUID } from 'node:crypto';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { AnbimaImaB5ConfigService } from './anbima-ima-b5.config';
import { AnbimaImaB5Service } from './anbima-ima-b5.service';

export const IMA_B5_RETRY_DELAYS_MS = [0, 10 * 60 * 1000, 20 * 60 * 1000, 30 * 60 * 1000];
export const IMA_B5_JOB_NAME = 'anbima-ima-b5-daily-rate';

@Injectable()
export class AnbimaImaB5Scheduler implements OnModuleInit {
  private readonly logger = new Logger(AnbimaImaB5Scheduler.name);

  constructor(
    private readonly config: AnbimaImaB5ConfigService,
    private readonly service: AnbimaImaB5Service,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    const job = new CronJob(
      this.config.value.cronExpression,
      () => void this.handleCron(),
      null,
      false,
      this.config.value.timezone,
    );
    this.schedulerRegistry.addCronJob(IMA_B5_JOB_NAME, job);
    if (this.config.value.jobEnabled) {
      job.start();
    }

    this.logger.log({
      event: 'anbima_ima_b5_scheduler_init',
      enabled: this.config.value.jobEnabled,
      jobTime: this.config.value.jobTime,
      cron: this.config.value.cronExpression,
      timezone: this.config.value.timezone,
    });
  }

  async handleCron(): Promise<void> {
    if (!this.config.value.jobEnabled) {
      this.logger.log({ event: 'anbima_ima_b5_scheduler_disabled' });
      return;
    }
    await this.runWithRetry(randomUUID());
  }

  async runWithRetry(executionId: string = randomUUID(), sleep = delay): Promise<void> {
    for (let index = 0; index < IMA_B5_RETRY_DELAYS_MS.length; index += 1) {
      const attempt = index + 1;
      const waitMs = IMA_B5_RETRY_DELAYS_MS[index];
      if (waitMs > 0) {
        await sleep(waitMs);
      }

      try {
        await this.service.runOnce(executionId, attempt);
        return;
      } catch (error) {
        const transient = this.service.isTransientError(error);
        this.logger.error({
          event: 'anbima_ima_b5_attempt_failed',
          executionId,
          attempt,
          transient,
          error: error instanceof Error ? error.message : String(error),
        });
        if (!transient || attempt === IMA_B5_RETRY_DELAYS_MS.length) {
          throw error;
        }
      }
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
