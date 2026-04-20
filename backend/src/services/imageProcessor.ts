import fs from "node:fs";
import path from "node:path";
import sharp, { type Sharp } from "sharp";

import { uploadDirectory } from "../constants/paths.js";
import type { FilterConfig, FilterType, ImageMetadata, ProcessingResult } from "../../../shared/types/index.js";

/**
 * Allowlist of image MIME types supported by this demo API.
 */
const supportedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const maxDimensionPx = 8192;

const sharpFormatToMime: Record<string, string> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export interface ProcessImageOptions {
  /** When aborted, processing stops and returns a failed result. */
  signal?: AbortSignal;
  /** Root directory containing stored image files. */
  uploadDir?: string;
}

/**
 * Maps sharp-reported format to a supported MIME type, if any.
 * @param format Value from sharp metadata `format` field.
 * @returns MIME type or undefined when unsupported.
 */
function mimeFromSharpFormat(format: string | undefined): string | undefined {
  if (!format) return undefined;
  return sharpFormatToMime[format];
}

/**
 * Ensures decoded dimensions are within safe bounds for processing.
 * @param width Pixel width from image metadata.
 * @param height Pixel height from image metadata.
 * @returns True when dimensions are valid for processing.
 */
function areDimensionsValid(width: number | undefined, height: number | undefined): boolean {
  if (!width || !height) return false;
  if (width < 1 || height < 1) return false;
  if (width > maxDimensionPx || height > maxDimensionPx) return false;
  return true;
}

/**
 * Converts filter intensity (0–100) to a linear brightness multiplier centered at 50.
 * @param intensity Filter intensity from the client payload.
 * @returns Linear multiplier passed to sharp.linear.
 */
function brightnessLinearMultiplier(intensity: number): number {
  const strength = (intensity - 50) / 50;
  return Math.min(2, Math.max(0.2, 1 + strength * 0.85));
}

/**
 * Converts filter intensity (0–100) to a linear contrast multiplier centered at 50.
 * @param intensity Filter intensity from the client payload.
 * @returns Linear multiplier passed to sharp.linear.
 */
function contrastLinearMultiplier(intensity: number): number {
  const strength = (intensity - 50) / 50;
  return Math.min(2.2, Math.max(0.35, 1 + strength * 0.9));
}

/**
 * Applies one filter operation to a sharp pipeline instance.
 * @param pipeline Active sharp instance to extend.
 * @param filter Filter configuration for this step.
 * @returns The same pipeline with the operation applied.
 */
function applyOneFilter(pipeline: Sharp, filter: FilterConfig): Sharp {
  const intensity = filter.intensity;
  switch (filter.type as FilterType) {
    case "blur":
      return pipeline.blur((intensity / 100) * 14 + 0.25);
    case "sharpen": {
      const sigma = (intensity / 100) * 3 + 0.35;
      return pipeline.sharpen({ sigma, m1: 1.2, m2: 0.35 });
    }
    case "grayscale":
      return pipeline.grayscale();
    case "sepia":
      return pipeline.recomb([
        [0.393, 0.769, 0.189],
        [0.349, 0.686, 0.168],
        [0.272, 0.534, 0.131],
      ]);
    case "brightness":
      return pipeline.linear(brightnessLinearMultiplier(intensity), 0);
    case "contrast":
      return pipeline.linear(contrastLinearMultiplier(intensity), 0);
    case "saturation": {
      const saturation = Math.min(3, Math.max(0, (intensity / 100) * 2.2));
      return pipeline.modulate({ saturation });
    }
    default:
      return pipeline;
  }
}

/**
 * Runs the filter chain and writes the encoded output to disk.
 * @param inputPath Absolute path to the source image file.
 * @param outputPath Absolute path for the processed output file.
 * @param filters Ordered filter operations to apply.
 * @param signal Optional abort signal checked between filter steps.
 * @returns Sharp output metadata after encoding.
 */
async function runPipelineToFile(
  inputPath: string,
  outputPath: string,
  filters: FilterConfig[],
  signal?: AbortSignal
): Promise<{ format?: string; size?: number; width?: number; height?: number }> {
  let pipeline = sharp(inputPath, { failOn: "truncated" });
  for (const filter of filters) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    pipeline = applyOneFilter(pipeline, filter);
  }
  return pipeline.toFile(outputPath);
}

type VerifiedInput = { inputPath: string; inputMeta: sharp.Metadata; verifiedMime: string };

/**
 * Returns a failure result when decoded metadata is not safe to process.
 * @param imageId Image identifier for the result payload.
 * @param inputMeta Sharp metadata for the source file.
 * @param startedAt Epoch ms when processing began.
 * @returns Failure result or null when the input passes validation.
 */
function validationFailureFromMetadata(
  imageId: string,
  inputMeta: sharp.Metadata,
  startedAt: number
): ProcessingResult | null {
  if (!areDimensionsValid(inputMeta.width, inputMeta.height)) {
    return {
      imageId,
      success: false,
      error: "Image dimensions are invalid or exceed the maximum allowed size",
      processingTimeMs: Date.now() - startedAt,
    };
  }
  const verifiedMime = mimeFromSharpFormat(inputMeta.format);
  if (!verifiedMime || !supportedMimeTypes.has(verifiedMime)) {
    return {
      imageId,
      success: false,
      error: "Unsupported or unrecognized image format",
      processingTimeMs: Date.now() - startedAt,
    };
  }
  return null;
}

/**
 * Validates the source file path and decodes metadata with sharp.
 * @param image Stored image metadata record.
 * @param rootDir Directory containing stored binaries.
 * @param startedAt Epoch ms when processing began.
 * @returns Verified paths and metadata, or a failure result.
 */
async function verifyInputForProcessing(
  image: ImageMetadata,
  rootDir: string,
  startedAt: number
): Promise<VerifiedInput | ProcessingResult> {
  const inputPath = path.join(rootDir, image.filename);
  if (!fs.existsSync(inputPath)) {
    return {
      imageId: image.id,
      success: false,
      error: "Source file not found",
      processingTimeMs: Date.now() - startedAt,
    };
  }

  let inputMeta: sharp.Metadata;
  try {
    inputMeta = await sharp(inputPath).metadata();
  } catch {
    return {
      imageId: image.id,
      success: false,
      error: "Could not read source image",
      processingTimeMs: Date.now() - startedAt,
    };
  }

  const invalid = validationFailureFromMetadata(image.id, inputMeta, startedAt);
  if (invalid) return invalid;

  const verifiedMime = mimeFromSharpFormat(inputMeta.format)!;
  return { inputPath, inputMeta, verifiedMime };
}

/**
 * Removes the previous binary after a successful in-place style replacement.
 * @param inputPath Absolute path to the former source file.
 * @param outputFilename New primary filename on disk.
 * @param previousFilename Filename before processing.
 * @returns void
 */
function removeReplacedSourceFile(inputPath: string, outputFilename: string, previousFilename: string): void {
  if (outputFilename === previousFilename || !fs.existsSync(inputPath)) return;
  try {
    fs.unlinkSync(inputPath);
  } catch {
    // Best-effort cleanup; output file remains valid.
  }
}

/**
 * Builds a failure result from a pipeline error, cleaning partial output when needed.
 * @param imageId Image identifier for the result payload.
 * @param outputPath Absolute path to a partial output file, if any.
 * @param error Error thrown by sharp or abort logic.
 * @param startedAt Epoch ms when processing began.
 * @returns Structured processing failure.
 */
function failureFromPipelineError(
  imageId: string,
  outputPath: string,
  error: unknown,
  startedAt: number
): ProcessingResult {
  try {
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  } catch {
    // ignore cleanup errors
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return {
      imageId,
      success: false,
      error: "Processing was cancelled",
      processingTimeMs: Date.now() - startedAt,
    };
  }

  return {
    imageId,
    success: false,
    error: "Image processing failed",
    processingTimeMs: Date.now() - startedAt,
  };
}

/**
 * Reads an image from disk, applies filters with sharp, and updates stored metadata.
 * @param image Metadata for the source image.
 * @param filters Filter configuration list to apply.
 * @param options Optional directory and cancellation controls.
 * @returns Processing outcome including output filename on success.
 */
export async function processImage(
  image: ImageMetadata,
  filters: FilterConfig[],
  options?: ProcessImageOptions
): Promise<ProcessingResult> {
  const startedAt = Date.now();
  const rootDir = options?.uploadDir ?? uploadDirectory;
  const verified = await verifyInputForProcessing(image, rootDir, startedAt);
  if (!("verifiedMime" in verified)) return verified;

  const outputFilename = calculateOutputFilename(image.filename, filters);
  const outputPath = path.join(rootDir, outputFilename);

  try {
    const outInfo = await runPipelineToFile(verified.inputPath, outputPath, filters, options?.signal);
    const outMime = mimeFromSharpFormat(outInfo.format) ?? verified.verifiedMime;
    const width = outInfo.width ?? verified.inputMeta.width ?? image.width;
    const height = outInfo.height ?? verified.inputMeta.height ?? image.height;
    removeReplacedSourceFile(verified.inputPath, outputFilename, image.filename);

    return {
      imageId: image.id,
      success: true,
      outputFilename,
      processingTimeMs: Date.now() - startedAt,
      updatedMetadata: {
        ...image,
        filename: outputFilename,
        mimeType: outMime,
        width,
        height,
        sizeBytes: outInfo.size ?? image.sizeBytes,
        updatedAt: new Date(),
      },
    };
  } catch (error) {
    return failureFromPipelineError(image.id, outputPath, error, startedAt);
  }
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
