import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../utils/errors.js";

/**
 * Default API key used for local development and demos.
 */
const defaultApiKey = "demo-key-2024";

/**
 * Validates x-api-key header against configured API key.
 * @param req Express request object.
 * @param _res Express response object.
 * @param next Express next callback.
 * @returns Calls next when authorized, otherwise passes ApiError.
 */
export function apiKeyAuth(req: Request, _res: Response, next: NextFunction): void {
  const expectedApiKey = process.env.API_KEY ?? defaultApiKey;
  const incomingApiKeyHeader = req.header("x-api-key");

  if (!incomingApiKeyHeader) {
    next(
      new ApiError("Missing API key", "UNAUTHORIZED", 401, {
        header: "x-api-key",
      })
    );
    return;
  }

  if (incomingApiKeyHeader !== expectedApiKey) {
    next(
      new ApiError("Invalid API key", "UNAUTHORIZED", 401, {
        header: "x-api-key",
      })
    );
    return;
  }

  next();
}
