import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import sharp from "sharp";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import type { ImageMetadata } from "../../../shared/types/index.js";
import { validateImageFormat } from "../services/imageProcessor.js";
import { storageService } from "../services/storageService.js";
import { ApiError } from "../utils/errors.js";
import { sanitizeFilename } from "../utils/validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDirectory = path.join(__dirname, "../../uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

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

    // Use sharp to inspect final stored file dimensions.
    const sharpMetadata = await sharp(storedFilePath).metadata();

    const metadata: ImageMetadata = {
      id: imageId,
      filename: storedFilename,
      originalName: sanitizeFilename(req.file.originalname),
      mimeType: req.file.mimetype,
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
