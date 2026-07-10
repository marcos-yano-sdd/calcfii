import { promises as fs } from 'node:fs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { AnbimaHeaderNotFoundError } from '../src/market-indices/anbima/anbima-ima-b5.errors';
import { AnbimaImaB5Service } from '../src/market-indices/anbima/anbima-ima-b5.service';

function makePool(locked = true) {
  return {
    query: vi.fn(async (sql: string) => {
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked }] };
      return { rows: [{ unlocked: true }] };
    }),
  };
}

describe('AnbimaImaB5Service', () => {
  it('downloads, parses, persists and removes the temp file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ima-b5-service-'));
    const filePath = join(dir, 'fixture.xlsx');
    writeFileSync(filePath, 'x');
    const repository = { upsertImaBRate: vi.fn(async () => undefined) };
    const service = new AnbimaImaB5Service(
      makePool() as never,
      { download: vi.fn(async () => ({ filePath, statusCode: 200, sizeBytes: 1, sha256: 'hash' })) } as never,
      { parse: vi.fn(() => ({ referenceDate: '2026-07-09', rate: '12.8000' })) } as never,
      repository as never,
    );

    await expect(service.runOnce('exec-1')).resolves.toMatchObject({ status: 'success', rate: '12.8000' });
    expect(repository.upsertImaBRate).toHaveBeenCalledWith('12.8000');
    await expect(fs.stat(filePath)).rejects.toThrow();
  });

  it('skips when advisory lock is not acquired', async () => {
    const repository = { upsertImaBRate: vi.fn() };
    const download = vi.fn();
    const service = new AnbimaImaB5Service(
      makePool(false) as never,
      { download } as never,
      { parse: vi.fn() } as never,
      repository as never,
    );

    await expect(service.runOnce('exec-2')).resolves.toEqual({ status: 'skipped', executionId: 'exec-2', reason: 'lock_not_acquired' });
    expect(download).not.toHaveBeenCalled();
    expect(repository.upsertImaBRate).not.toHaveBeenCalled();
  });

  it('preserves previous value and cleans file on parser error', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ima-b5-service-'));
    const filePath = join(dir, 'fixture.xlsx');
    writeFileSync(filePath, 'x');
    const repository = { upsertImaBRate: vi.fn() };
    const service = new AnbimaImaB5Service(
      makePool() as never,
      { download: vi.fn(async () => ({ filePath, statusCode: 200, sizeBytes: 1, sha256: 'hash' })) } as never,
      { parse: vi.fn(() => { throw new AnbimaHeaderNotFoundError('missing header'); }) } as never,
      repository as never,
    );

    await expect(service.runOnce('exec-3')).rejects.toThrow(AnbimaHeaderNotFoundError);
    expect(repository.upsertImaBRate).not.toHaveBeenCalled();
    await expect(fs.stat(filePath)).rejects.toThrow();
  });
});
