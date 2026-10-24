"use client";

import React, { useState, useEffect } from "react";

export interface DoctorAvatarProps {
  imageUrl?: string | null;
  gender?: string | null;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  shape?: "circle" | "rounded" | "square";
}

/**
 * Returns the default placeholder avatar path based on doctor gender.
 */
export const getDoctorDefaultAvatar = (gender?: string | null): string => {
  const g = (gender || "").trim().toLowerCase();
  if (g === "male" || g === "m") {
    return "/assets/img/doctor-avatar-male.svg";
  }
  if (g === "female" || g === "f") {
    return "/assets/img/doctor-avatar-female.svg";
  }
  return "/assets/img/doctor-avatar-neutral.svg";
};

/**
 * Shared DoctorAvatar component that renders:
 * 1. doctor.imageUrl if non-empty string and successfully loads.
 * 2. Default avatar asset based on gender (Male -> doctor-avatar-male.svg, Female -> doctor-avatar-female.svg, Other/missing -> doctor-avatar-neutral.svg)
 * 3. Graceful fallback to gender avatar on image load error.
 */
const DoctorAvatar: React.FC<DoctorAvatarProps> = ({
  imageUrl,
  gender,
  size = 40,
  className = "",
  style = {},
  alt = "Doctor",
  shape = "circle",
}) => {
  const [imgError, setImgError] = useState(false);

  // Reset error state if imageUrl prop changes
  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  const defaultAvatar = getDoctorDefaultAvatar(gender);
  const trimmedUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";
  const resolvedSrc = trimmedUrl && !imgError ? trimmedUrl : defaultAvatar;

  const dimensionStyle: React.CSSProperties =
    typeof size === "number"
      ? { width: `${size}px`, height: `${size}px`, minWidth: `${size}px`, minHeight: `${size}px` }
      : { width: size, height: size };

  const radiusStyle: React.CSSProperties =
    shape === "circle"
      ? { borderRadius: "50%" }
      : shape === "rounded"
      ? { borderRadius: "8px" }
      : {};

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt}
      className={`doctor-avatar object-fit-cover flex-shrink-0 ${className}`}
      style={{
        ...dimensionStyle,
        ...radiusStyle,
        objectFit: "cover",
        ...style,
      }}
      onError={() => {
        if (!imgError && trimmedUrl) {
          setImgError(true);
        }
      }}
    />
  );
};

export default DoctorAvatar;
