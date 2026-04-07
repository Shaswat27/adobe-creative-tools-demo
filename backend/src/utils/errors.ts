/**
 * Base application error with consistent metadata fields.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  /**
   * Creates a new application error.
   * @param message Human-readable error message.
   * @param code Stable machine-readable error code.
   * @param statusCode HTTP status code for API responses.
   * @param details Optional extra error details for debugging.
   * @returns A configured AppError instance.
   */
  public constructor(message: string, code: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * API-specific error used by route handlers and middleware.
 */
export class ApiError extends AppError {
  /**
   * Creates a new API error.
   * @param message Human-readable error message.
   * @param code Stable machine-readable error code.
   * @param statusCode HTTP status code for API responses.
   * @param details Optional extra error details for debugging.
   * @returns A configured ApiError instance.
   */
  public constructor(message: string, code: string, statusCode: number, details?: unknown) {
    super(message, code, statusCode, details);
    this.name = "ApiError";
  }
}
