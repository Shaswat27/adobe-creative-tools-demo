import type { BatchJob, FilterConfig, ProcessingResult } from "./image";

/**
 * Standard API response wrapper.
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Application-level API error with metadata.
 */
export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(message: string, code: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Request payload for preparing an upload.
 */
export interface UploadRequest {
  filename: string;
  mimeType: string;
}

/**
 * Request payload for applying filters to a single image.
 */
export interface FilterRequest {
  imageId: string;
  filters: FilterConfig[];
}

/**
 * Request payload for creating a batch filter job.
 */
export interface BatchRequest {
  imageIds: string[];
  filters: FilterConfig[];
}

/**
 * Response payload for retrieving batch job status.
 */
export interface BatchStatusResponse {
  job: BatchJob;
  results?: ProcessingResult[];
}
