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

  return (
    <div className={classes}>
      <span className="pranaos-mark" aria-hidden="true">
        P
      </span>
      {!compact && (
        <span className="pranaos-text">
          <span className="pranaos-wordmark">
            Prana<span>OS</span>
          </span>
          <span className="pranaos-sub">JJM hospital</span>
        </span>
      )}
    </div>
  );
};

export default PranaOSBrand;
