import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { extname, join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { AnbimaImaB5ConfigService } from './anbima-ima-b5.config';
import { AnbimaDownloadError, AnbimaFileTooLargeError, AnbimaHttpError, AnbimaInvalidSpreadsheetError } from './anbima-ima-b5.errors';
import { DownloadedSpreadsheet } from './anbima-ima-b5.types';

@Injectable()
export class AnbimaImaB5Client {
  private readonly logger = new Logger(AnbimaImaB5Client.name);

  constructor(private readonly config: AnbimaImaB5ConfigService) {}

  async download(executionId: string, attempt: number): Promise<DownloadedSpreadsheet> {
    const cfg = this.config.value;
    const source = new URL(cfg.url);
    if (source.protocol !== 'https:') {
      throw new AnbimaDownloadError('Only HTTPS ANBIMA URLs are accepted');
    }

    await fs.mkdir(cfg.tempDir, { recursive: true });
    const extension = ['.xls', '.xlsx'].includes(extname(source.pathname).toLowerCase())
      ? extname(source.pathname).toLowerCase()
      : '.xlsx';
    const filePath = join(cfg.tempDir, `ima-b5-${executionId}-${attempt}-${randomUUID()}${extension}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), cfg.downloadTimeoutMs);

    try {
      const response = await fetch(source, { signal: controller.signal, redirect: 'follow' });
      const finalUrl = new URL(response.url);
      if (finalUrl.protocol !== 'https:') {
        throw new AnbimaDownloadError('Redirected ANBIMA URL is not HTTPS');
      }
      if (!response.ok) {
        throw new AnbimaHttpError(response.status);
      }
      if (!response.body) {
        throw new AnbimaDownloadError('ANBIMA response body is empty', true);
      }

      let sizeBytes = 0;
      const chunks: Uint8Array[] = [];
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        sizeBytes += value.byteLength;
        if (sizeBytes > cfg.maxFileSizeBytes) {
          throw new AnbimaFileTooLargeError(`ANBIMA file exceeds ${cfg.maxFileSizeBytes} bytes`);
        }
        chunks.push(value);
      }
      if (sizeBytes === 0) {
        throw new AnbimaDownloadError('ANBIMA response body is empty', true);
      }

      const buffer = Buffer.concat(chunks);
      await fs.writeFile(filePath, buffer, { flag: 'wx', mode: 0o600 });
      this.validateSpreadsheet(filePath);
      const sha256 = createHash('sha256').update(buffer).digest('hex');
      this.logger.log({ event: 'anbima_downloaded', executionId, attempt, statusCode: response.status, sizeBytes, sha256 });
      return { filePath, statusCode: response.status, sizeBytes, sha256 };
    } catch (error) {
      await fs.rm(filePath, { force: true }).catch(() => undefined);
      if (error instanceof AnbimaHttpError || error instanceof AnbimaFileTooLargeError || error instanceof AnbimaDownloadError) throw error;
      const transient = error instanceof DOMException && error.name === 'AbortError';
      throw new AnbimaDownloadError(transient ? 'ANBIMA download timed out' : 'ANBIMA download failed', transient, error);
    } finally {
      clearTimeout(timeout);
    }
  }

  private validateSpreadsheet(filePath: string): void {
    try {
      const workbook = XLSX.readFile(filePath, { cellDates: true, cellFormula: false, WTF: false });
      if (workbook.SheetNames.length === 0) {
        throw new Error('Workbook has no sheets');
      }
    } catch (error) {
      throw new AnbimaInvalidSpreadsheetError('Downloaded file is not a readable spreadsheet', false, error);
    }
  }
}
