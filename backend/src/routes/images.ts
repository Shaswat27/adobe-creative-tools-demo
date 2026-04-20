import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import sharp from "sharp";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import type { ImageMetadata } from "../../../shared/types/index.js";
import { ensureUploadDirectory, uploadDirectory } from "../constants/paths.js";
import { validateImageFormat } from "../services/imageProcessor.js";
import { storageService } from "../services/storageService.js";
import { ApiError } from "../utils/errors.js";
import { sanitizeFilename } from "../utils/validation.js";

ensureUploadDirectory();

const upload = multer({ dest: uploadDirectory });
export const imagesRouter = Router();

imagesRouter.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError("No file uploaded", "UPLOAD_REQUIRED", 400);

    if (!validateImageFormat(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      throw new ApiError("Unsupported image MIME type", "INVALID_MIME_TYPE", 400, { mimeType: req.file.mimetype });
    }

    const fileExtension = path.extname(sanitizeFilename(req.file.originalname)) || ".img";
    const imageId = uuidv4();
    const storedFilename = `${imageId}${fileExtension}`;
    const storedFilePath = path.join(uploadDirectory, storedFilename);
    fs.renameSync(req.file.path, storedFilePath);

    const sharpMetadata = await sharp(storedFilePath).metadata();
    const formatToMime: Record<string, string> = {
      jpeg: "image/jpeg",
      jpg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    const verifiedMime = sharpMetadata.format ? formatToMime[sharpMetadata.format] : undefined;
    if (!verifiedMime || !validateImageFormat(verifiedMime)) {
      fs.unlinkSync(storedFilePath);
      throw new ApiError("Unsupported image format (content verification failed)", "INVALID_IMAGE_CONTENT", 400);
    }

    const metadata: ImageMetadata = {
      id: imageId,
      filename: storedFilename,
      originalName: sanitizeFilename(req.file.originalname),
      mimeType: verifiedMime,
      width: sharpMetadata.width ?? 0,
      height: sharpMetadata.height ?? 0,
      sizeBytes: req.file.size,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    storageService.save(metadata);
    res.status(201).json(metadata);
  } catch (error) {
    next(error);
  }
});

imagesRouter.get("/", (_req, res) => {
  res.json(storageService.findAll());
});

imagesRouter.get("/file/:filename", (req, res, next) => {
  try {
    const requested = path.basename(req.params.filename);
    if (requested !== req.params.filename || requested.includes("..")) {
      next(new ApiError("Invalid filename", "INVALID_FILENAME", 400));
      return;
    }
    const absolutePath = path.join(uploadDirectory, requested);
    const relativeToUploads = path.relative(uploadDirectory, absolutePath);
    if (relativeToUploads.startsWith("..") || path.isAbsolute(relativeToUploads)) {
      next(new ApiError("Invalid filename", "INVALID_FILENAME", 400));
      return;
    }
    if (!fs.existsSync(absolutePath)) {
      next(new ApiError("File not found", "FILE_NOT_FOUND", 404));
      return;
    }
    res.sendFile(absolutePath);
  } catch (error) {
    next(error);
  }
});

imagesRouter.get("/:id", (req, res, next) => {
  const metadata = storageService.findById(req.params.id);
  if (!metadata) {
    next(new ApiError("Image not found", "IMAGE_NOT_FOUND", 404));
    return;
  }
  res.json(metadata);
});

imagesRouter.delete("/:id", (req, res, next) => {
  const metadata = storageService.findById(req.params.id);
  if (!metadata) {
    next(new ApiError("Image not found", "IMAGE_NOT_FOUND", 404));
    return;
  }

  const filePath = path.join(uploadDirectory, metadata.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  storageService.delete(req.params.id);
  res.status(204).send();
});
