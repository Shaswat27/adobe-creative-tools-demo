import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";

import { batchRouter } from "./routes/batch.js";
import { filtersRouter } from "./routes/filters.js";
import { imagesRouter } from "./routes/images.js";
import { rateLimitMiddleware } from "./middleware/rateLimit.js";
import { ApiError } from "./utils/errors.js";

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Kept global for demo stability; auth middleware remains available but not auto-mounted.
app.use(rateLimitMiddleware);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "backend", timestamp: new Date().toISOString() });
});

app.use("/api/images", imagesRouter);
app.use("/api/filters", filtersRouter);
app.use("/api/batch", batchRouter);

app.use((_req, _res, next: NextFunction) => {
  next(new ApiError("Route not found", "NOT_FOUND", 404));
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
});

app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});
