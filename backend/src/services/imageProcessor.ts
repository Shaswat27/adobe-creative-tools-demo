import type { FilterConfig, ImageMetadata, ProcessingResult } from "../../../shared/types/index.js";

/**
 * Allowlist of image MIME types supported by this demo API.
 */
const supportedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Applies simulated filters to an image and returns processing results.
 * @param image Metadata for the source image.
 * @param filters Filter configuration list to apply.
 * @returns Simulated image processing outcome.
 */
export async function processImage(
  image: ImageMetadata,
  filters: FilterConfig[]
): Promise<ProcessingResult> {
  const startedAt = Date.now();

  for (const filter of filters) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 200 + Math.max(0, filter.intensity));
    });
  }

  return {
    imageId: image.id,
    success: true,
    outputFilename: calculateOutputFilename(image.filename, filters),
    processingTimeMs: Date.now() - startedAt,
  };
}

/**
 * Validates whether an uploaded MIME type is supported.
 * @param mimeType MIME type supplied by upload middleware.
 * @returns True when the MIME type is allowed.
 */
export function validateImageFormat(mimeType: string): boolean {
  return supportedMimeTypes.has(mimeType);
}

/**
 * Generates an output filename with filter type suffixes.
 * @param originalFilename Original stored filename.
 * @param filters Filter list used during processing.
 * @returns Deterministic transformed filename.
 */
export function calculateOutputFilename(originalFilename: string, filters: FilterConfig[]): string {
  const dotIndex = originalFilename.lastIndexOf(".");
  const basename = dotIndex > -1 ? originalFilename.slice(0, dotIndex) : originalFilename;
  const extension = dotIndex > -1 ? originalFilename.slice(dotIndex) : "";
  const suffix = filters.map((filter) => filter.type).join("-");
  return `${basename}-${suffix || "processed"}${extension}`;
}

// TODO: Implement actual sharp-based filter pipeline — currently simulated
/**
 * Stub hook for future sharp-based filter processing logic.
 * @param _inputPath Source image path to process.
 * @param _filters Filter list to apply with sharp.
 * @returns Promise that resolves when implementation is completed.
 */
export async function applySharpFilter(_inputPath: string, _filters: FilterConfig[]): Promise<void> {
  return Promise.resolve();
}
