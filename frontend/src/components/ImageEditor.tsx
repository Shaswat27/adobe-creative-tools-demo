import React, { useMemo, useState } from "react";
import { ImageMetadata } from "../../../shared/types";

interface ImageEditorProps {
  imageId: string;
  metadata: ImageMetadata;
  onOpenFilterPanel: () => void;
  onOpenExport: () => void;
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const metaRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "12px",
};

const labelStyle: React.CSSProperties = {
  fontWeight: 500,
  marginRight: 4,
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  marginTop: "4px",
};

const buttonStyle: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: "12px",
  cursor: "pointer",
};

const statusStyle: React.CSSProperties = {
  marginTop: "4px",
  fontSize: "12px",
};

export const ImageEditor: React.FC<ImageEditorProps> = ({
  imageId,
  metadata,
  onOpenFilterPanel,
  onOpenExport,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const sizeKb = useMemo(
    () => (metadata.sizeBytes / 1024).toFixed(1),
    [metadata.sizeBytes]
  );

  const createdAtLabel = useMemo(() => {
    try {
      const date =
        metadata.createdAt instanceof Date
          ? metadata.createdAt
          : new Date(metadata.createdAt);
      return date.toLocaleString();
    } catch {
      return String(metadata.createdAt);
    }
  }, [metadata.createdAt]);

  const handleApplyFilterClick = () => {
    setLastAction(`apply-filter-${imageId}-${Date.now()}`);
    setStatusMessage("Preparing filter options...");
    setIsProcessing(true);

    // Simulate a short delay to show status transition before opening panel
    window.setTimeout(() => {
      setIsProcessing(false);
      setStatusMessage("Configure your filter in the panel.");
      onOpenFilterPanel();
    }, 300);
  };

  const handleOpenExport = () => {
    setLastAction(`export-${imageId}-${Date.now()}`);
    setStatusMessage("Preparing export options...");
    onOpenExport();
  };

  const visibleStatus = useMemo(() => {
    if (isProcessing) {
      return "Processing... applying filter configuration.";
    }
    return statusMessage;
  }, [isProcessing, statusMessage]);

  return (
    <div style={containerStyle}>
      <div style={{ fontSize: 13, fontWeight: 500 }}>
        Editing: {metadata.originalName || metadata.filename}
      </div>

      <div style={metaRowStyle}>
        <div>
          <span style={labelStyle}>ID:</span>
          <span>{metadata.id}</span>
        </div>
        <div>
          <span style={labelStyle}>Size:</span>
          <span>{sizeKb} KB</span>
        </div>
      </div>

      <div style={metaRowStyle}>
        <div>
          <span style={labelStyle}>Dimensions:</span>
          <span>
            {metadata.width} x {metadata.height}
          </span>
        </div>
        <div>
          <span style={labelStyle}>Created:</span>
          <span>{createdAtLabel}</span>
        </div>
      </div>

      <div style={metaRowStyle}>
        <div>
          <span style={labelStyle}>MIME:</span>
          <span>{metadata.mimeType}</span>
        </div>
        <div>
          <span style={labelStyle}>Filename:</span>
          <span>{metadata.filename}</span>
        </div>
      </div>

      <div style={buttonRowStyle}>
        <button
          style={buttonStyle}
          onClick={handleApplyFilterClick}
          disabled={isProcessing}
        >
          {isProcessing ? "Applying..." : "Apply Filter"}
        </button>
        <button style={buttonStyle} onClick={handleOpenExport}>
          Export...
        </button>
      </div>

      {visibleStatus && (
        <div style={statusStyle}>
          <span style={{ fontWeight: 500 }}>Status:</span> {visibleStatus}
          {lastAction && (
            <span style={{ marginLeft: 4, color: "#777" }}>
              ({lastAction.split("-")[0]})
            </span>
          )}
        </div>
      )}
    </div>
  );
};

