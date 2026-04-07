import { useCallback, useEffect, useState } from "react";
import { BatchJob, BatchStatusResponse, FilterConfig, ImageMetadata } from "../../../shared/types";

interface UseImageProcessorState {
  images: ImageMetadata[];
  loading: boolean;
  error: string | null;
}

interface UseImageProcessorResult extends UseImageProcessorState {
  uploadImage: (file: File) => Promise<void>;
  applyFilter: (imageId: string, filters: FilterConfig[]) => Promise<void>;
  createBatchJob: (imageIds: string[], filters: FilterConfig[]) => Promise<BatchJob>;
  getBatchStatus: (jobId: string) => Promise<BatchStatusResponse>;
  refreshImages: () => Promise<void>;
}

async function handleJsonResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";

  let body: unknown;
  if (contentType.includes("application/json")) {
    body = await res.json();
  } else {
    const text = await res.text();
    if (!res.ok) {
      throw new Error(text || `Request failed with status ${res.status}`);
    }
    return text as unknown as T;
  }

  const json = body as unknown as { error?: { message?: string } } | T;

  if (!res.ok) {
    const message =
      (typeof json === "object" &&
        json !== null &&
        "error" in json &&
        (json as { error?: { message?: string } }).error?.message) ||
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return json as T;
}

export const useImageProcessor = (): UseImageProcessorResult => {
  const [state, setState] = useState<UseImageProcessorState>({
    images: [],
    loading: false,
    error: null,
  });

  const setLoading = (loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  };

  const setError = (error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  };

  const setImages = (images: ImageMetadata[]) => {
    setState((prev) => ({ ...prev, images }));
  };

  const listImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/images");
      const data = await handleJsonResponse<ImageMetadata[]>(res);
      setImages(
        data.map((img) => ({
          ...img,
          createdAt:
            img.createdAt instanceof Date
              ? img.createdAt
              : new Date(img.createdAt),
          updatedAt:
            img.updatedAt instanceof Date
              ? img.updatedAt
              : new Date(img.updatedAt),
        }))
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to load images list.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadImage = useCallback(async (file: File) => {
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/images/upload", {
      method: "POST",
      body: formData,
    });

    await handleJsonResponse<ImageMetadata>(res);
  }, []);

  const applyFilter = useCallback(
    async (imageId: string, filters: FilterConfig[]) => {
      setError(null);
      const res = await fetch("/api/filters/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageId, filters }),
      });

      await handleJsonResponse<unknown>(res);
    },
    []
  );

  const createBatchJob = useCallback(
    async (imageIds: string[], filters: FilterConfig[]) => {
      setError(null);
      const res = await fetch("/api/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageIds, filters }),
      });

      const { job } = await handleJsonResponse<{ job: BatchJob }>(res);
      return job;
    },
    []
  );

  const getBatchStatus = useCallback(async (jobId: string) => {
    setError(null);
    const res = await fetch(`/api/batch/${encodeURIComponent(jobId)}`);
    const status = await handleJsonResponse<BatchStatusResponse>(res);
    return status;
  }, []);

  const refreshImages = useCallback(async () => {
    await listImages();
  }, [listImages]);

  useEffect(() => {
    listImages();
  }, [listImages]);

  return {
    images: state.images,
    loading: state.loading,
    error: state.error,
    uploadImage,
    applyFilter,
    createBatchJob,
    getBatchStatus,
    refreshImages,
  };
};

