import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import * as XLSX from 'xlsx';
import { AnbimaHeaderNotFoundError, AnbimaInvalidRateError, AnbimaNoValidRecordError } from './anbima-ima-b5.errors';
import { ParsedImaB5Rate } from './anbima-ima-b5.types';

type HeaderMap = {
  headerRow: number;
  dateColumn: number;
  rateColumn: number;
  indexColumn?: number;
};

type CandidateRecord = {
  referenceDate: string;
  timestamp: number;
  rate: string;
};

@Injectable()
export class AnbimaImaB5Parser {
  parse(filePath: string): ParsedImaB5Rate {
    const workbook = XLSX.readFile(filePath, { cellDates: true, cellFormula: false, raw: true });
    const candidates: CandidateRecord[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
      const header = this.findHeader(rows);
      for (let rowIndex = header.headerRow + 1; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex] ?? [];
        if (this.isEmptyRow(row)) continue;
        if (header.indexColumn !== undefined && !this.isImaB5(row[header.indexColumn])) continue;

        const date = this.parseDate(row[header.dateColumn]);
        if (!date) continue;
        const rate = this.tryNormalizeRate(row[header.rateColumn]);
        if (!rate) continue;
        candidates.push({ referenceDate: date.iso, timestamp: date.timestamp, rate });
      }
    }

    if (candidates.length === 0) {
      throw new AnbimaNoValidRecordError();
    }

    const latest = candidates.sort((a, b) => b.timestamp - a.timestamp)[0];
    return { referenceDate: latest.referenceDate, rate: latest.rate };
  }

  normalizeRate(value: unknown): string {
    let text: string;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new AnbimaInvalidRateError('Rate is not finite');
      text = String(value);
    } else if (typeof value === 'string') {
      text = value.trim().replace(/\s/g, '').replace('%', '');
    } else {
      throw new AnbimaInvalidRateError('Rate is empty or not numeric');
    }

    if (!text) throw new AnbimaInvalidRateError('Rate is empty');
    const normalized = this.normalizeNumericText(text);
    if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
      throw new AnbimaInvalidRateError(`Invalid rate value: ${text}`);
    }

    const decimal = new Decimal(normalized).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
    if (decimal.lt(-100) || decimal.gt(500)) {
      throw new AnbimaInvalidRateError(`Rate out of defensive range: ${decimal.toFixed(4)}`);
    }
    return decimal.toFixed(4);
  }

  private findHeader(rows: unknown[][]): HeaderMap {
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] ?? [];
      let dateColumn = -1;
      let rateColumn = -1;
      let indexColumn: number | undefined;

      for (let column = 0; column < row.length; column += 1) {
        const header = normalizeText(row[column]);
        if (isDateHeader(header)) dateColumn = column;
        if (isRateHeader(header)) rateColumn = column;
        if (isIndexHeader(header)) indexColumn = column;
      }

      if (dateColumn >= 0 && rateColumn >= 0) {
        return { headerRow: rowIndex, dateColumn, rateColumn, indexColumn };
      }
    }
    throw new AnbimaHeaderNotFoundError('Could not find IMA-B 5 date and 12-month variation headers');
  }

  private parseDate(value: unknown): { iso: string; timestamp: number } | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return toUtcDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
    }
    if (typeof value === 'number') {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (!parsed) return null;
      return toUtcDate(parsed.y, parsed.m, parsed.d);
    }
    if (typeof value !== 'string') return null;
    const text = value.trim();
    let match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
    if (match) return toUtcDate(Number(match[3]), Number(match[2]), Number(match[1]));
    match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (match) return toUtcDate(Number(match[1]), Number(match[2]), Number(match[3]));
    return null;
  }

  private isImaB5(value: unknown): boolean {
    return normalizeText(value) === 'ima b 5';
  }

  private isEmptyRow(row: unknown[]): boolean {
    return row.every((cell) => cell === null || cell === undefined || String(cell).trim() === '');
  }

  private tryNormalizeRate(value: unknown): string | null {
    try {
      return this.normalizeRate(value);
    } catch (error) {
      if (error instanceof AnbimaInvalidRateError) return null;
      throw error;
    }
  }

  private normalizeNumericText(value: string): string {
    const negative = value.startsWith('-');
    let text = negative ? value.slice(1) : value;
    const comma = text.lastIndexOf(',');
    const dot = text.lastIndexOf('.');
    if (comma >= 0 && dot >= 0) {
      const decimalSeparator = comma > dot ? ',' : '.';
      const thousandSeparator = decimalSeparator === ',' ? '.' : ',';
      text = text.replace(new RegExp(`\\${thousandSeparator}`, 'g'), '').replace(decimalSeparator, '.');
    } else if (comma >= 0) {
      text = text.replace(/\./g, '').replace(',', '.');
    } else {
      const dotCount = (text.match(/\./g) ?? []).length;
      if (dotCount > 1) {
        const lastDot = text.lastIndexOf('.');
        text = `${text.slice(0, lastDot).replace(/\./g, '')}.${text.slice(lastDot + 1)}`;
      }
    }
    return `${negative ? '-' : ''}${text}`;
  }
}

export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[%()]/g, ' $& ')
    .replace(/[-_]+/g, ' ')
    .replace(/[^a-z0-9%()+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isRateHeader(header: string): boolean {
  return ['variacao 12 meses ( % )', 'variacao 12 meses', '12 meses ( % )', '12 meses'].includes(header);
}

function isDateHeader(header: string): boolean {
  return ['data', 'data referencia', 'data de referencia', 'dt referencia', 'referencia'].includes(header);
}

function isIndexHeader(header: string): boolean {
  return ['indice', 'nome indice', 'nome do indice', 'indexador', 'nome'].includes(header);
}

function toUtcDate(year: number, month: number, day: number): { iso: string; timestamp: number } | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { iso: date.toISOString().slice(0, 10), timestamp };
}
