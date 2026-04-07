import React, { useMemo, useState } from "react";

interface ExportDialogProps {
  imageId: string;
  visible: boolean;
  onClose: () => void;
}

type ExportFormat = "jpeg" | "png" | "webp";

interface ExportConfig {
  imageId: string;
  format: ExportFormat;
  quality: number;
  resize: boolean;
  width?: number;
  height?: number;
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const dialogStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  borderRadius: 4,
  padding: 16,
  width: 320,
  fontSize: 12,
  boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
};

const rowStyle: React.CSSProperties = {
  marginBottom: 8,
  display: "flex",
  flexDirection: "column" as const,
};

const labelStyle: React.CSSProperties = {
  fontWeight: 500,
  marginBottom: 4,
};

const selectStyle: React.CSSProperties = {
  padding: "4px 6px",
  fontSize: 12,
};

const sliderRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const resizeRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 4,
};

const inputStyle: React.CSSProperties = {
  width: 70,
  padding: "2px 4px",
  fontSize: 12,
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 12,
};

const buttonStyle: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: 12,
  cursor: "pointer",
};

export const ExportDialog: React.FC<ExportDialogProps> = ({
  imageId,
  visible,
  onClose,
}) => {
  const [format, setFormat] = useState<ExportFormat>("jpeg");
  const [quality, setQuality] = useState<number>(80);
  const [resize, setResize] = useState(false);
  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [lastExport, setLastExport] = useState<ExportConfig | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleExport = () => {
    setStatus("Preparing export options...");

    const config: ExportConfig = {
      imageId,
      format,
      quality,
      resize,
      width: resize && width ? Number(width) : undefined,
      height: resize && height ? Number(height) : undefined,
    };

    setTimeout(() => {
      // Simulate export by logging
      // eslint-disable-next-line no-console
      console.log("Export config", config);
      setLastExport(config);
      setStatus("Export complete!");

      // Allow user to see the completion message briefly, then reset.
      setTimeout(() => {
        setStatus(null);
      }, 500);
    }, 500);
  };

  const canExport = useMemo(() => {
    if (!resize) return true;
    const w = width ? Number(width) : 0;
    const h = height ? Number(height) : 0;
    return w > 0 && h > 0;
  }, [resize, width, height]);

  if (!visible) {
    return null;
  }

  return (
    <div style={overlayStyle}>
      <div style={dialogStyle}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          Export Image {imageId.slice(0, 6)}
        </div>

        <div style={rowStyle}>
          <label style={labelStyle} htmlFor="export-format">
            Format
          </label>
          <select
            id="export-format"
            style={selectStyle}
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
          >
            <option value="jpeg">JPEG</option>
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
          </select>
        </div>

        <div style={rowStyle}>
          <label style={labelStyle} htmlFor="export-quality">
            Quality ({quality})
          </label>
          <div style={sliderRowStyle}>
            <input
              id="export-quality"
              type="range"
              min={1}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
            />
            <span>{quality}</span>
          </div>
        </div>

        <div style={rowStyle}>
          <label style={labelStyle}>
            <input
              type="checkbox"
              checked={resize}
              onChange={(e) => setResize(e.target.checked)}
            />{" "}
            Resize
          </label>
          {resize && (
            <div style={resizeRowStyle}>
              <div>
                <span>Width</span>
                <input
                  type="number"
                  style={inputStyle}
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                />
              </div>
              <div>
                <span>Height</span>
                <input
                  type="number"
                  style={inputStyle}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div style={buttonRowStyle}>
          <button style={buttonStyle} type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            style={buttonStyle}
            type="button"
            onClick={handleExport}
            disabled={!canExport}
          >
            Export
          </button>
        </div>

        {lastExport && (
          <div style={{ marginTop: 8, fontSize: 11, color: "#555" }}>
            Last export: {lastExport.format.toUpperCase()} at{" "}
            {lastExport.quality}% quality
            {lastExport.resize &&
              ` (${lastExport.width}x${lastExport.height || "auto"})`}
          </div>
        )}
      </div>

      {status && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#555" }}>{status}</div>
      )}
    </div>
  );
};

