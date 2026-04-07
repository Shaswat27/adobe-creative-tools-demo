/**
 * Describes stored metadata for an uploaded image.
 */
export interface ImageMetadata {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Supported filter types for image processing.
 */
export type FilterType =
  | "blur"
  | "sharpen"
  | "grayscale"
  | "sepia"
  | "brightness"
  | "contrast"
  | "saturation";

/**
 * Filter configuration used by single or batch image processing.
 */
export interface FilterConfig {
  type: FilterType;
  intensity: number;
  params?: Record<string, number>;
}

/**
 * Status values for a queued image processing batch.
 */
export type BatchJobStatus = "queued" | "processing" | "completed" | "failed";

/**
 * Tracks a batch processing job and its lifecycle.
 */
export interface BatchJob {
  id: string;
  status: BatchJobStatus;
  images: string[];
  filters: FilterConfig[];
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Represents the processing result for a single image.
 */
export interface ProcessingResult {
  imageId: string;
  success: boolean;
  outputFilename?: string;
  error?: string;
  processingTimeMs: number;
}
