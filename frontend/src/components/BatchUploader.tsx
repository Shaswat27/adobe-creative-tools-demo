import React, { useCallback, useMemo, useState } from "react";

interface BatchUploaderProps {
  onUploadImage: (file: File) => Promise<void>;
  onUploadComplete: () => void;
  onCreateBatchFromAll: () => void;
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  fontSize: 12,
};

const dropZoneStyle: React.CSSProperties = {
  border: "2px dashed #aaa",
  padding: 16,
  textAlign: "center",
  borderRadius: 4,
  cursor: "pointer",
  backgroundColor: "#fafafa",
};

const fileListStyle: React.CSSProperties = {
  maxHeight: 150,
  overflowY: "auto",
  borderTop: "1px solid #eee",
  paddingTop: 6,
};

const fileItemStyle: React.CSSProperties = {
  padding: "4px 0",
  display: "flex",
  justifyContent: "space-between",
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginTop: 8,
};

const buttonStyle: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: 12,
  cursor: "pointer",
};

export const BatchUploader: React.FC<BatchUploaderProps> = ({
  onUploadImage,
  onUploadComplete,
  onCreateBatchFromAll,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (fileList: FileList) => {
    const nextFiles = Array.from(fileList);
    if (!nextFiles.length) return;
    setFiles((prev) => [...prev, ...nextFiles]);
    setError(null);
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      handleFiles(event.dataTransfer.files);
      event.dataTransfer.clearData();
    }
  };

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files) {
      handleFiles(event.target.files);
    }
  };

  const uploadAll = useCallback(async () => {
    if (!files.length) return;
    setUploadingIndex(0);
    setUploadedCount(0);
    setError(null);

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      setUploadingIndex(i);
      try {
        await onUploadImage(file);
        setUploadedCount((prev) => prev + 1);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to upload one of the files.";
        setError(message);
      }
    }

    setUploadingIndex(null);
    onUploadComplete();
  }, [files, onUploadImage, onUploadComplete]);

  const progressLabel = useMemo(() => {
    if (!files.length) {
      return "No files selected.";
    }
    if (uploadingIndex === null) {
      return `${uploadedCount} of ${files.length} uploaded.`;
    }
    return `${uploadedCount} of ${files.length} uploaded (uploading ${
      files[uploadingIndex].name
    }).`;
  }, [files, uploadedCount, uploadingIndex]);

  const dropLabel = isDragging
    ? "Drop files to add them"
    : "Drag and drop images here, or click to browse.";

  return (
    <div style={containerStyle}>
      <div
        style={{
          ...dropZoneStyle,
          backgroundColor: isDragging ? "#eef3ff" : "#fafafa",
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => {
          const input = document.getElementById(
            "batch-upload-input"
          ) as HTMLInputElement | null;
          if (input) {
            input.click();
          }
        }}
      >
        {dropLabel}
      </div>
      <input
        id="batch-upload-input"
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />

      <div style={fileListStyle}>
        {files.map((file, index) => (
          <div key={`${file.name}-${index}`} style={fileItemStyle}>
            <span>{file.name}</span>
            <span style={{ color: "#555" }}>
              {(file.size / 1024).toFixed(1)} KB
            </span>
          </div>
        ))}
        {!files.length && (
          <div style={{ fontSize: 11, color: "#777" }}>
            No files added yet.
          </div>
        )}
      </div>

      <div>{progressLabel}</div>

      <div style={buttonRowStyle}>
        <button
          style={buttonStyle}
          onClick={uploadAll}
          disabled={!files.length || uploadingIndex !== null}
        >
          {uploadingIndex !== null ? "Uploading..." : "Upload All"}
        </button>
        <button
          style={buttonStyle}
          onClick={onCreateBatchFromAll}
          disabled={!files.length}
        >
          Apply Filters to All
        </button>
      </div>

      {error && (
        <div style={{ color: "red", fontSize: 11, marginTop: 4 }}>{error}</div>
      )}
    </div>
  );
};

