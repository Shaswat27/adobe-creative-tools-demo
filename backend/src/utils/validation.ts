import type { NextFunction, Request, Response } from "express";
import { z, type ZodTypeAny } from "zod";

import { ApiError } from "./errors.js";

/**
 * Allowed image MIME types for upload validation.
 */
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * Validates upload payload data.
 */
export const uploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(allowedMimeTypes),
});

/**
 * Validates filter operation payloads.
 */
export const filterRequestSchema = z.object({
  imageId: z.string().uuid(),
  filters: z.array(
    z.object({
      type: z.enum(["blur", "sharpen", "grayscale", "sepia", "brightness", "contrast", "saturation"]),
      intensity: z.number().min(0).max(100),
      params: z.record(z.number()).optional(),
    })
  ).min(1),
});

/**
 * Validates batch processing payloads.
 */
export const batchRequestSchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1),
  filters: filterRequestSchema.shape.filters,
});

/**
 * Creates middleware that validates request body against a schema.
 * @param schema Zod schema to evaluate incoming body payloads.
 * @returns Express middleware that throws ApiError when validation fails.
 */
export function validateRequest<TSchema extends ZodTypeAny>(schema: TSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(
        new ApiError("Request validation failed", "VALIDATION_ERROR", 400, parsed.error.flatten())
      );
      return;
    }

    req.body = parsed.data;
    next();
  };
}

/**
 * Sanitizes filenames to avoid path traversal and unsafe characters.
 * @param filename Original user-provided filename.
 * @returns Sanitized filesystem-safe filename.
 */
export function sanitizeFilename(filename: string): string {
  const noTraversal = filename.replace(/[\\/]+/g, "_").replace(/\.\./g, "");
  const safeFilename = noTraversal.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safeFilename.length > 0 ? safeFilename : "upload.bin";
}
