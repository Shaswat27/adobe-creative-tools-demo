import React, { useMemo, useState } from "react";
import { FilterType } from "../../../shared/types";
import { useImageProcessor } from "../hooks/useImageProcessor";

interface FilterPanelProps {
  imageId: string;
  onFilterApplied: () => void;
}

const panelStyle: React.CSSProperties = {
  position: "fixed",
  right: "16px",
  bottom: "16px",
  width: "260px",
  backgroundColor: "#fff",
  border: "1px solid #ccc",
  borderRadius: 4,
  padding: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  fontSize: 12,
};

const rowStyle: React.CSSProperties = {
  marginBottom: 8,
  display: "flex",
  flexDirection: "column" as const,
};

const labelStyle: React.CSSProperties = {
  marginBottom: 4,
  fontWeight: 500,
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

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 8,
};

const buttonStyle: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: 12,
  cursor: "pointer",
};

const spinnerStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: "50%",
  border: "2px solid #ccc",
  borderTopColor: "#555",
  animation: "spin 1s linear infinite",
};

const filterTypes: FilterType[] = [
  "blur",
  "sharpen",
  "grayscale",
  "sepia",
  "brightness",
  "contrast",
  "saturation",
];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  imageId,
  onFilterApplied,
}) => {
  const { applyFilter } = useImageProcessor();
  const [filterType, setFilterType] = useState<FilterType>("grayscale");
  const [intensity, setIntensity] = useState<number>(60);
  const [submitting, setSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const disabled = submitting;

  const handleApply = async () => {
    setSubmitting(true);
    setResultMessage(null);
    setErrorMessage(null);

    try {
      await applyFilter(imageId, [
        {
          type: filterType,
          intensity,
        },
      ]);
      setResultMessage(`Filter "${filterType}" applied successfully.`);
      onFilterApplied();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to apply filter. Please retry.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  const infoLabel = useMemo(
    () => `Applying filter to image ${imageId.slice(0, 6)}...`,
    [imageId]
  );

  return (
    <div style={panelStyle}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Filter Panel</div>

      <div style={rowStyle}>
        <label style={labelStyle} htmlFor="filter-type">
          Filter Type
        </label>
        <select
          id="filter-type"
          style={selectStyle}
          value={filterType}
          disabled={disabled}
          onChange={(e) => setFilterType(e.target.value as FilterType)}
        >
          {filterTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div style={rowStyle}>
        <label style={labelStyle} htmlFor="filter-intensity">
          Intensity ({intensity})
        </label>
        <div style={sliderRowStyle}>
          <input
            id="filter-intensity"
            type="range"
            min={0}
            max={100}
            value={intensity}
            disabled={disabled}
            onChange={(e) => setIntensity(Number(e.target.value))}
          />
          <span>{intensity}</span>
        </div>
      </div>

      <div style={buttonRowStyle}>
        <button
          style={buttonStyle}
          onClick={handleApply}
          disabled={disabled}
        >
          {submitting ? "Applying..." : "Apply"}
        </button>
        {submitting && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={spinnerStyle} />
            <span style={{ fontSize: 11 }}>Processing...</span>
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: 11 }}>
        <div>{infoLabel}</div>
        {resultMessage && (
          <div style={{ color: "green", marginTop: 4 }}>{resultMessage}</div>
        )}
        {errorMessage && (
          <div style={{ color: "red", marginTop: 4 }}>{errorMessage}</div>
        )}
      </div>
    </div>
  );
};

