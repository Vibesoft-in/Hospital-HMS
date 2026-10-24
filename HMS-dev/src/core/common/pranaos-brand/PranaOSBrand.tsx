import React from "react";

interface IPranaOSBrandProps {
  className?: string;
  size?: "default" | "lg";
  compact?: boolean;
}

const PranaOSBrand = ({
  className = "",
  size = "default",
  compact = false,
}: IPranaOSBrandProps) => {
  const classes = [
    "pranaos-brand",
    size === "lg" ? "pranaos-brand--lg" : "",
    compact ? "pranaos-brand--compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const imgSize = size === "lg" ? 44 : 32;

  return (
    <div
      className={classes}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        minWidth: 0,
        lineHeight: 1,
      }}
    >
      <img
        src="/jjm-signage/jjm_logo.png"
        alt="JJM Hospital"
        className="pranaos-mark"
        style={{
          width: `${imgSize}px`,
          height: `${imgSize}px`,
          maxWidth: `${imgSize}px`,
          maxHeight: `${imgSize}px`,
          objectFit: "contain",
          flexShrink: 0,
        }}
      />
      {!compact && (
        <span
          className="pranaos-text"
          style={{
            display: "inline-flex",
            alignItems: "center",
            minWidth: 0,
            whiteSpace: "nowrap",
          }}
        >
          <span
            className="pranaos-wordmark"
            style={{
              fontSize: size === "lg" ? "1.5rem" : "1.15rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
              color: "#1e293b",
            }}
          >
            JJM <span style={{ color: "#704E8E" }}>Hospital</span>
          </span>
        </span>
      )}
    </div>
  );
};

export default PranaOSBrand;
