export class AnbimaJobError extends Error {
  constructor(message: string, public readonly transient = false, public readonly cause?: unknown) {
    super(message);
  }
}

export class AnbimaDownloadError extends AnbimaJobError {}
export class AnbimaHttpError extends AnbimaJobError {
  constructor(public readonly statusCode: number) {
    super(`ANBIMA download failed with HTTP ${statusCode}`, statusCode === 429 || statusCode >= 500);
  }
}
export class AnbimaFileTooLargeError extends AnbimaJobError {}
export class AnbimaInvalidSpreadsheetError extends AnbimaJobError {}
export class AnbimaHeaderNotFoundError extends AnbimaJobError {}
export class AnbimaNoValidRecordError extends AnbimaJobError {
  constructor(message = 'No valid IMA-B 5 record found', transient = true) {
    super(message, transient);
  }
}
export class AnbimaInvalidRateError extends AnbimaJobError {}
export class AnbimaPersistenceError extends AnbimaJobError {}
export class AnbimaCleanupError extends AnbimaJobError {}
