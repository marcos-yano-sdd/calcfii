import { describe, expect, it, vi } from 'vitest';
import { cronFromJobTime } from '../src/market-indices/anbima/anbima-ima-b5.config';
import { IMA_B5_DEFAULT_CRON, IMA_B5_DEFAULT_JOB_TIME, IMA_B5_TIMEZONE } from '../src/market-indices/anbima/anbima-ima-b5.types';
import { AnbimaDownloadError } from '../src/market-indices/anbima/anbima-ima-b5.errors';
import { AnbimaImaB5Scheduler } from '../src/market-indices/anbima/anbima-ima-b5.scheduler';

describe('AnbimaImaB5Scheduler', () => {
  it('declares the required default time, cron and timezone', () => {
    expect(IMA_B5_DEFAULT_JOB_TIME).toBe('22:00');
    expect(IMA_B5_DEFAULT_CRON).toBe('0 0 22 * * *');
    expect(cronFromJobTime('22:00')).toBe('0 0 22 * * *');
    expect(IMA_B5_TIMEZONE).toBe('America/Sao_Paulo');
  });

  it('does not run when the job is disabled', async () => {
    const service = { runOnce: vi.fn(), isTransientError: vi.fn() };
    const scheduler = new AnbimaImaB5Scheduler({ value: { jobEnabled: false } } as never, service as never, { addCronJob: vi.fn() } as never);
    await scheduler.handleCron();
    expect(service.runOnce).not.toHaveBeenCalled();
  });

  it('retries transient errors and stops after success', async () => {
    const error = new AnbimaDownloadError('timeout', true);
    const service = {
      runOnce: vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce({ status: 'success' }),
      isTransientError: vi.fn((value) => value === error),
    };
    const scheduler = new AnbimaImaB5Scheduler({ value: { jobEnabled: true } } as never, service as never, { addCronJob: vi.fn() } as never);
    await scheduler.runWithRetry('exec-4', vi.fn(async () => undefined));
    expect(service.runOnce).toHaveBeenCalledTimes(2);
  });

  it('does not retry permanent errors', async () => {
    const error = new Error('permanent');
    const service = {
      runOnce: vi.fn().mockRejectedValue(error),
      isTransientError: vi.fn(() => false),
    };
    const scheduler = new AnbimaImaB5Scheduler({ value: { jobEnabled: true } } as never, service as never, { addCronJob: vi.fn() } as never);
    await expect(scheduler.runWithRetry('exec-5', vi.fn())).rejects.toThrow('permanent');
    expect(service.runOnce).toHaveBeenCalledTimes(1);
  });
});
