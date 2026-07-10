import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { AnbimaImaB5Config, IMA_B5_DEFAULT_JOB_TIME, IMA_B5_TIMEZONE } from './anbima-ima-b5.types';

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function readPositiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

export function cronFromJobTime(jobTime: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(jobTime);
  if (!match) {
    throw new Error('ANBIMA_IMA_B5_JOB_TIME must use HH:mm format, for example 22:00');
  }
  return `0 ${Number(match[2])} ${Number(match[1])} * * *`;
}

@Injectable()
export class AnbimaImaB5ConfigService {
  readonly value: AnbimaImaB5Config;

  constructor() {
    const jobEnabled = readBoolean(process.env.ANBIMA_IMA_B5_JOB_ENABLED, true);
    const url = process.env.ANBIMA_IMA_B5_XLS_URL ?? '';
    const jobTime = process.env.ANBIMA_IMA_B5_JOB_TIME || IMA_B5_DEFAULT_JOB_TIME;
    const cronExpression = cronFromJobTime(jobTime);
    const timezone = process.env.ANBIMA_IMA_B5_JOB_TIMEZONE || IMA_B5_TIMEZONE;
    const tempDir = resolve(process.env.ANBIMA_IMA_B5_TEMP_DIR || tmpdir(), 'anbima-ima-b5');

    if (jobEnabled && !url) {
      throw new Error('ANBIMA_IMA_B5_XLS_URL is required when ANBIMA_IMA_B5_JOB_ENABLED is true');
    }
    if (url && new URL(url).protocol !== 'https:') {
      throw new Error('ANBIMA_IMA_B5_XLS_URL must use HTTPS');
    }
    if (timezone !== IMA_B5_TIMEZONE) {
      throw new Error(`ANBIMA_IMA_B5_JOB_TIMEZONE must be ${IMA_B5_TIMEZONE}`);
    }

    this.value = {
      url,
      jobEnabled,
      jobTime,
      cronExpression,
      timezone,
      tempDir,
      downloadTimeoutMs: readPositiveInteger('ANBIMA_IMA_B5_DOWNLOAD_TIMEOUT_MS', 30000),
      maxFileSizeBytes: readPositiveInteger('ANBIMA_IMA_B5_MAX_FILE_SIZE_BYTES', 20971520),
    };
  }
}
