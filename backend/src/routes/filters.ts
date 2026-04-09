import { Router } from "express";

import type { FilterRequest } from "../../../shared/types/index.js";
import { processImage } from "../services/imageProcessor.js";
import { storageService } from "../services/storageService.js";
import { ApiError } from "../utils/errors.js";
import { filterRequestSchema, validateRequest } from "../utils/validation.js";

export const filtersRouter = Router();

filtersRouter.post(
  "/apply",
  validateRequest(filterRequestSchema),
  async (req, res, next) => {
    try {
      const payload = req.body as FilterRequest;
      const image = storageService.findById(payload.imageId);

      if (!image) {
        throw new ApiError("Image not found", "IMAGE_NOT_FOUND", 404, {
          imageId: payload.imageId,
        });
      }

      const result = await processImage(image, payload.filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

filtersRouter.get("/types", (_req, res) => {
  res.json([
    { type: "blur", description: "Applies Gaussian blur for softening details." },
    { type: "sharpen", description: "Boosts edge contrast to increase detail clarity." },
    { type: "grayscale", description: "Converts the image to grayscale tones." },
    { type: "sepia", description: "Applies a warm vintage-style sepia color tone." },
    { type: "brightness", description: "Adjusts image luminance up or down." },
    { type: "contrast", description: "Changes the difference between light and dark areas." },
    { type: "saturation", description: "Adjusts color intensity and vibrancy." },
  ]);
});

filtersRouter.post("/apply", async (req, res) => {
  const { imageId, filterType } = req.body;
  res.send({ imageId, filterType, status: "applied" });
});