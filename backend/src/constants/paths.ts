import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Absolute directory where uploaded and processed image binaries are stored.
 */
export const uploadDirectory = path.join(__dirname, "../../uploads");

/**
 * Ensures the upload directory exists on disk.
 * @returns void
 */
export function ensureUploadDirectory(): void {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}
