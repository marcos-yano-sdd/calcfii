import { mkdtempSync } from 'node:fs';
import { readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Pool } from 'pg';
import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { GlobalConfigRepository } from '../src/market-indices/config/config.repository';
import { AnbimaImaB5Parser } from '../src/market-indices/anbima/anbima-ima-b5.parser';

const maybeDescribe = process.env.DATABASE_URL ? describe : describe.skip;

maybeDescribe('IMA-B 5 integration', () => {
  it('persists 12,8000 as 12.8000 and leaves no temp file', async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const dir = mkdtempSync(join(tmpdir(), 'ima-b5-it-'));
    const file = join(dir, 'fixture.xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Índice', 'Data de Referência', 'Variação 12 meses (%)'],
      ['IMA-B 5', '2026-07-09', '12,8000'],
    ]), 'Fixture');
    XLSX.writeFile(wb, file);

    try {
      await pool.query('CREATE TABLE IF NOT EXISTS config (id INTEGER PRIMARY KEY, taxa_ima_b NUMERIC(9,4))');
      await pool.query('DELETE FROM config');
      const parsed = new AnbimaImaB5Parser().parse(file);
      await new GlobalConfigRepository(pool).upsertImaBRate(parsed.rate);
      await rm(file, { force: true });
      const result = await pool.query('SELECT id, taxa_ima_b::text AS taxa_ima_b FROM config WHERE id = 1');
      expect(result.rows[0]).toEqual({ id: 1, taxa_ima_b: '12.8000' });
      expect(await readdir(dir)).toEqual([]);
    } finally {
      await pool.end();
      await rm(dir, { recursive: true, force: true });
    }
  });
});
