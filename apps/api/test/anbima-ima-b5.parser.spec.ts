import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { AnbimaInvalidRateError, AnbimaNoValidRecordError } from '../src/market-indices/anbima/anbima-ima-b5.errors';
import { AnbimaImaB5Parser } from '../src/market-indices/anbima/anbima-ima-b5.parser';

const parser = new AnbimaImaB5Parser();

function workbook(rows: unknown[][], sheetName = 'Resultado estranho'): string {
  const dir = mkdtempSync(join(tmpdir(), 'ima-b5-parser-'));
  const file = join(dir, 'fixture.xlsx');
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheetName);
  XLSX.writeFile(wb, file);
  return file;
}

function cleanup(file: string): void {
  rmSync(file.replace(/fixture\.xlsx$/, ''), { recursive: true, force: true });
}

describe('AnbimaImaB5Parser', () => {
  it('parses exact headers, intro rows, reordered columns and latest IMA-B 5 only', () => {
    const file = workbook([
      ['intro'],
      ['Índice', 'Variação 12 meses (%)', 'Data de Referência'],
      ['IMA-B 5+', '99,0000', '2026-07-09'],
      ['IMA-B', '88,0000', '2026-07-09'],
      ['IMA-B 5', '11,0000', '08/07/2026'],
      ['IMA-B 5', '12,8000', '2026-07-09'],
    ]);
    try {
      expect(parser.parse(file)).toEqual({ referenceDate: '2026-07-09', rate: '12.8000' });
    } finally {
      cleanup(file);
    }
  });

  it('accepts headers without accents, line breaks, numeric cells, percent signs and unexpected sheet name', () => {
    const file = workbook([
      ['Data\nReferencia', '12 meses (%)'],
      [new Date(Date.UTC(2026, 6, 8)), 12.8],
      ['09/07/2026', '12,8000%'],
    ], 'abc');
    try {
      expect(parser.parse(file)).toEqual({ referenceDate: '2026-07-09', rate: '12.8000' });
    } finally {
      cleanup(file);
    }
  });

  it('accepts native Excel serial date and dot decimal', () => {
    const file = workbook([
      ['Data', 'Variacao 12 Meses'],
      [46212, '12.8000'],
    ]);
    try {
      expect(parser.parse(file).rate).toBe('12.8000');
    } finally {
      cleanup(file);
    }
  });

  it('ignores rows with empty rate and keeps looking for a valid record', () => {
    const file = workbook([
      ['Índice', 'Data de Referência', 'Variação 12 meses (%)'],
      ['IMA-B 5', '2026-07-10', ''],
      ['IMA-B 5', '2026-07-09', '12,8000'],
    ]);
    try {
      expect(parser.parse(file)).toEqual({ referenceDate: '2026-07-09', rate: '12.8000' });
    } finally {
      cleanup(file);
    }
  });

  it('rejects missing valid records and out-of-range rates', () => {
    const noRecord = workbook([
      ['Índice', 'Variação 12 meses (%)', 'Data de Referência'],
      ['IMA-B 5+', '12,8000', '2026-07-09'],
    ]);
    try {
      expect(() => parser.parse(noRecord)).toThrow(AnbimaNoValidRecordError);
    } finally {
      cleanup(noRecord);
    }

    expect(() => parser.normalizeRate('501,0000')).toThrow(AnbimaInvalidRateError);
    expect(() => parser.normalizeRate('abc')).toThrow(AnbimaInvalidRateError);
  });
});
