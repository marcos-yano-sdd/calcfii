export const IMA_B5_DEFAULT_JOB_TIME = '22:00';
export const IMA_B5_DEFAULT_CRON = '0 0 22 * * *';
export const IMA_B5_TIMEZONE = 'America/Sao_Paulo';
export const IMA_B5_LOCK_KEY = 2026070902;

export type AnbimaImaB5Config = {
  url: string;
  jobEnabled: boolean;
  jobTime: string;
  cronExpression: string;
  timezone: string;
  tempDir: string;
  downloadTimeoutMs: number;
  maxFileSizeBytes: number;
};

export type DownloadedSpreadsheet = {
  filePath: string;
  statusCode: number;
  sizeBytes: number;
  sha256: string;
};

export type ParsedImaB5Rate = {
  referenceDate: string;
  rate: string;
};

export type ImanB5RunResult =
  | { status: 'success'; executionId: string; referenceDate: string; rate: string }
  | { status: 'skipped'; executionId: string; reason: string };
