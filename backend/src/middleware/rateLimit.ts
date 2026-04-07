import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../utils/errors.js";

/**
 * Tracks per-IP request usage and reset windows.
 */
const requestWindowMs = 60_000;
const maxRequestsPerWindow = 100;
const ipRequestMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Enforces an in-memory fixed-window rate limit per IP address.
 * @param req Express request object.
 * @param _res Express response object.
 * @param next Express next callback.
 * @returns Calls next when under limit, otherwise passes ApiError.
 */
export function rateLimitMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const requesterIp = req.ip || req.socket.remoteAddress || "unknown";
  const currentTime = Date.now();
  const existingWindow = ipRequestMap.get(requesterIp);

  if (!existingWindow || currentTime > existingWindow.resetTime) {
    ipRequestMap.set(requesterIp, {
      count: 1,
      resetTime: currentTime + requestWindowMs,
    });
    next();
    return;
  }

  existingWindow.count += 1;
  ipRequestMap.set(requesterIp, existingWindow);

  if (existingWindow.count > maxRequestsPerWindow) {
    const retryAfterSeconds = Math.ceil((existingWindow.resetTime - currentTime) / 1000);
    next(
      new ApiError("Rate limit exceeded", "RATE_LIMIT_EXCEEDED", 429, {
        retryAfterSeconds,
        maxRequests: maxRequestsPerWindow,
      })
    );
    return;
  }

  next();
}
