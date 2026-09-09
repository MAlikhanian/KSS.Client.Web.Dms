/**
 * The one error type every DMS data function rejects with.
 *
 * Each code carries the HTTP status the eventual API would return, so when
 * mock-store.ts is swapped for real calls the catch blocks already written in
 * the UI keep working: the store maps a response status back to the same code
 * and throws the same class. Nothing at a call site changes.
 *
 * The status is DERIVED from the code, never passed in, so the two cannot
 * drift apart across the dozens of throw sites.
 */

export type DmsErrorCode =
  | 'NotFound'
  | 'Validation'
  | 'Conflict'
  | 'Forbidden'
  | 'Unavailable';

const HTTP_STATUS: Record<DmsErrorCode, number> = {
  NotFound: 404,
  Validation: 422,
  Conflict: 409,
  Forbidden: 403,
  Unavailable: 503,
};

export class DmsError extends Error {
  readonly code: DmsErrorCode;
  readonly httpStatus: number;
  /** Field-level detail for Validation, keyed by field name. */
  readonly details?: Readonly<Record<string, string>>;

  constructor(
    code: DmsErrorCode,
    message: string,
    details?: Record<string, string>,
  ) {
    super(message);
    this.name = 'DmsError';
    this.code = code;
    this.httpStatus = HTTP_STATUS[code];
    this.details = details;
    // Required when targeting ES5-era output, so `instanceof` keeps working.
    Object.setPrototypeOf(this, DmsError.prototype);
  }
}

export function isDmsError(value: unknown): value is DmsError {
  return value instanceof DmsError;
}

/** Map a real HTTP status back to a code — used when the fetch swap happens. */
export function codeForStatus(status: number): DmsErrorCode {
  switch (status) {
    case 404:
      return 'NotFound';
    case 422:
      return 'Validation';
    case 409:
      return 'Conflict';
    case 403:
      return 'Forbidden';
    default:
      return 'Unavailable';
  }
}

// ─── Throw helpers ──────────────────────────────────────────────────────────
// Named so the message is consistent everywhere and a reader of a stack trace
// can tell which invariant fired.

export function notFound(entity: string, id: string): DmsError {
  return new DmsError('NotFound', `${entity} '${id}' was not found.`);
}

export function conflict(message: string): DmsError {
  return new DmsError('Conflict', message);
}

export function validation(
  message: string,
  details?: Record<string, string>,
): DmsError {
  return new DmsError('Validation', message, details);
}

export function forbidden(message: string): DmsError {
  return new DmsError('Forbidden', message);
}

export function unavailable(message: string): DmsError {
  return new DmsError('Unavailable', message);
}
