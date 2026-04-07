import React, { useEffect, useState } from "react";
import { ImageMetadata, BatchJob } from "../../shared/types";
import { useImageProcessor } from "./hooks/useImageProcessor";
import { ImageEditor } from "./components/ImageEditor";
import { FilterPanel } from "./components/FilterPanel";
import { BatchUploader } from "./components/BatchUploader";
import { ExportDialog } from "./components/ExportDialog";

const containerStyle: React.CSSProperties = {
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  padding: "16px",
  color: "#111",
};

const headerStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 600,
  marginBottom: "16px",
};

const sectionsWrapperStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr",
  gap: "16px",
  alignItems: "flex-start",
};

const columnStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "12px",
  borderRadius: "4px",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 500,
  marginBottom: "8px",
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  maxHeight: "260px",
  overflowY: "auto",
};

const listItemStyle: React.CSSProperties = {
  padding: "6px 8px",
  cursor: "pointer",
  borderRadius: "3px",
};

const activeListItemStyle: React.CSSProperties = {
  ...listItemStyle,
  backgroundColor: "#eef3ff",
};

export const App: React.FC = () => {
  const {
    images,
    loading,
    error,
    uploadImage,
    applyFilter,
    createBatchJob,
    getBatchStatus,
    refreshImages,
  } = useImageProcessor();

  const [selectedImage, setSelectedImage] = useState<ImageMetadata | null>(null);
  const [showFilterPanelFor, setShowFilterPanelFor] = useState<string | null>(null);
  const [showExportFor, setShowExportFor] = useState<string | null>(null);
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [activeBatchJobId, setActiveBatchJobId] = useState<string | null>(null);

  useEffect(() => {
    refreshImages();
  }, [refreshImages]);

  useEffect(() => {
    if (!selectedImage && images.length > 0) {
      setSelectedImage(images[0]);
    }
  }, [images, selectedImage]);

  const handleUploadComplete = async () => {
    await refreshImages();
  };

  const handleCreateBatchFromAll = async () => {
    if (!images.length) return;
    const imageIds = images.map((img) => img.id);
    try {
      const job = await createBatchJob(imageIds, [
        { type: "grayscale", intensity: 60 },
      ]);
      setBatchJobs((prev) => [...prev, job]);
      setActiveBatchJobId(job.id);
    } catch (e) {
      // noop, error already handled in hook state
    }
  };

  const handlePollBatchStatus = async (jobId: string) => {
    try {
      const status = await getBatchStatus(jobId);
      setBatchJobs((prev) =>
        prev.map((job) => (job.id === status.job.id ? status.job : job))
      );
    } catch {
      // ignore for now
    }
  };

  // Auto-poll batch status while any job is queued/processing.
  useEffect(() => {
    if (!activeBatchJobId) return;
    const job = batchJobs.find((j) => j.id === activeBatchJobId);
    if (!job) return;
    if (job.status !== "queued" && job.status !== "processing") {
      return;
    }

    const intervalId = window.setInterval(() => {
      void handlePollBatchStatus(activeBatchJobId).catch(() => undefined);
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeBatchJobId, batchJobs, handlePollBatchStatus]);

  const activeImageId = selectedImage?.id ?? null;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>Creative Tools Demo</div>

      {loading && <div style={{ marginBottom: 8 }}>Loading images...</div>}
      {error && (
        <div style={{ marginBottom: 8, color: "red" }}>
          Error: {error}
        </div>
      )}

      <div style={sectionsWrapperStyle}>
        <div style={columnStyle}>
          <div style={sectionTitleStyle}>Upload</div>
          <BatchUploader
            onUploadImage={uploadImage}
            onUploadComplete={handleUploadComplete}
            onCreateBatchFromAll={handleCreateBatchFromAll}
          />
        </div>

        <div style={columnStyle}>
          <div style={sectionTitleStyle}>Images</div>
          <ul style={listStyle}>
            {images.map((img) => (
              <li
                key={img.id}
                style={
                  activeImageId === img.id ? activeListItemStyle : listItemStyle
                }
                onClick={() => setSelectedImage(img)}
              >
                <div>{img.originalName}</div>
                <div style={{ fontSize: 12, color: "#555" }}>
                  {img.width}x{img.height} • {(img.sizeBytes / 1024).toFixed(1)} KB
                </div>
              </li>
            ))}
            {!images.length && (
              <li style={{ fontSize: 12, color: "#777" }}>
                No images yet. Upload some to get started.
              </li>
            )}
          </ul>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
        <div style={columnStyle}>
          <div style={sectionTitleStyle}>Filter Panel</div>
          {selectedImage ? (
            <ImageEditor
              imageId={selectedImage.id}
              metadata={selectedImage}
              onOpenFilterPanel={() => setShowFilterPanelFor(selectedImage.id)}
              onOpenExport={() => setShowExportFor(selectedImage.id)}
            />
          ) : (
            <div style={{ fontSize: 12, color: "#777" }}>
              Select an image to edit.
            </div>
          )}
        </div>

        <div style={columnStyle}>
          <div style={sectionTitleStyle}>Batch Jobs</div>
          {batchJobs.length === 0 && (
            <div style={{ fontSize: 12, color: "#777" }}>
              No batch jobs yet. Use "Apply Filters to All" after uploading.
            </div>
          )}
          {batchJobs.map((job) => (
            <div
              key={job.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 4,
                padding: 8,
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 500 }}>Job {job.id}</div>
              <div style={{ fontSize: 12 }}>
                Status: {job.status} • Progress: {job.progress}%
              </div>
              {job.error && (
                <div style={{ fontSize: 12, color: "red" }}>{job.error}</div>
              )}
              <button
                style={{
                  marginTop: 4,
                  padding: "4px 8px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
                onClick={() => handlePollBatchStatus(job.id)}
              >
                Refresh Status
              </button>
            </div>
          ))}
        </div>
      </div>

      {activeImageId && showFilterPanelFor === activeImageId && (
        <FilterPanel
          imageId={activeImageId}
          onFilterApplied={() => {
            setShowFilterPanelFor(null);
            refreshImages();
          }}
        />
      )}

      {activeImageId && showExportFor === activeImageId && (
        <ExportDialog
          imageId={activeImageId}
          visible={true}
          onClose={() => setShowExportFor(null)}
        />
      )}
    </div>
  );
};

export default App;
