import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import type { BatchJob, BatchRequest, BatchStatusResponse, ProcessingResult } from "../../../shared/types/index.js";
import { processImage } from "../services/imageProcessor.js";
import { storageService } from "../services/storageService.js";
import { ApiError } from "../utils/errors.js";
import { batchRequestSchema, validateRequest } from "../utils/validation.js";
type BatchState = { job: BatchJob; results: ProcessingResult[] };
const jobsMap = new Map<string, BatchState>();
export const batchRouter = Router();
async function runBatch(jobId: string): Promise<void> {
  try {
    const state = jobsMap.get(jobId);
    if (!state) return;
    state.job.status = "processing";
    const totalWork = Math.max(1, state.job.images.length * state.job.filters.length);
    let completedSteps = 0;
    for (const imageId of state.job.images) {
      if (jobsMap.get(jobId)?.job.status === "failed") return;
      const image = storageService.findById(imageId);
      if (!image) {
        state.results.push({ imageId, success: false, error: "Image not found", processingTimeMs: 0 });
        completedSteps += state.job.filters.length;
        state.job.progress = Math.min(100, Math.round((completedSteps / totalWork) * 100));
        continue;
      }
      const result = await processImage(image, state.job.filters);
      state.results.push(result);
      completedSteps += state.job.filters.length;
      state.job.progress = Math.min(100, Math.round((completedSteps / totalWork) * 100));
    }
    state.job.status = "completed";
    state.job.completedAt = new Date();
  } catch (_error) {
    const state = jobsMap.get(jobId);
    if (state) {
      state.job.status = "failed";
      state.job.error = "Batch processing failed";
      state.job.completedAt = new Date();
    }
  }
}
batchRouter.post("/", validateRequest(batchRequestSchema), async (req, res, next) => {
  try {
    const payload = req.body as BatchRequest;
    const jobId = uuidv4();
    const job: BatchJob = {
      id: jobId,
      status: "queued",
      images: payload.imageIds,
      filters: payload.filters,
      progress: 0,
      createdAt: new Date(),
    };
    jobsMap.set(jobId, { job, results: [] });
    void runBatch(jobId).catch(() => undefined);
    res.status(202).json({ job });
  } catch (error) {
    next(error);
  }
});
batchRouter.get("/:jobId", (req, res, next) => {
  const state = jobsMap.get(req.params.jobId);
  if (!state) return next(new ApiError("Batch job not found", "BATCH_NOT_FOUND", 404));
  const response: BatchStatusResponse = { job: state.job, results: state.results };
  res.json(response);
});
batchRouter.delete("/:jobId", (req, res, next) => {
  const state = jobsMap.get(req.params.jobId);
  if (!state) return next(new ApiError("Batch job not found", "BATCH_NOT_FOUND", 404));
  state.job.status = "failed";
  state.job.error = "Cancelled by user";
  state.job.completedAt = new Date();
  res.json({ job: state.job });
});
