"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

interface IIpdPatientCompactUploadProps {
  label: string;
  placeholder: string;
  hint: string;
  accept: string;
  file: File | null;
  previewUrl?: string;
  onFileChange: (file: File | null) => void;
  /** Clears an existing server-side preview (called on Remove along with onFileChange(null)). */
  onClear?: () => void;
  disabled?: boolean;
}

const IpdPatientCompactUpload = ({
  label,
  placeholder,
  hint,
  accept,
  file,
  previewUrl,
  onFileChange,
  onClear,
  disabled = false,
}: IIpdPatientCompactUploadProps) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file?.type.startsWith("image/")) {
      setFilePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const imagePreviewSrc = filePreviewUrl ?? (previewUrl && !file ? previewUrl : null);

  const applyFile = useCallback(
    (next: File | null) => {
      if (disabled) return;
      onFileChange(next);
    },
    [disabled, onFileChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    applyFile(e.target.files?.[0] ?? null);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) applyFile(dropped);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    applyFile(null);
    if (inputRef.current) inputRef.current.value = "";
    onClear?.();
  };

  const hasImage = Boolean(imagePreviewSrc);

  return (
    <div className="d-flex flex-column" style={{ width: "7.5rem", maxWidth: "100%" }}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        className={`border border-2 rounded-3 d-flex flex-column align-items-center justify-content-center text-center overflow-hidden ${
          hasImage ? "" : disabled ? "bg-light opacity-75 px-2 py-3" : "bg-white px-2 py-3"
        } ${isDragging ? "border-primary bg-light" : "border-secondary border-opacity-25"}`}
        style={{
          width: "7.5rem",
          height: "7.5rem",
          cursor: disabled ? (hasImage ? "default" : "not-allowed") : "pointer",
          borderStyle: hasImage ? "solid" : "dashed",
        }}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="d-none"
          accept={accept}
          disabled={disabled}
          onChange={handleInputChange}
        />
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagePreviewSrc!}
            alt={label}
            className="object-fit-cover"
            style={{ width: "100%", height: "100%" }}
          />
        ) : file ? (
          <>
            <i className="ti ti-file-text fs-28 text-muted mb-2" aria-hidden />
            <span className="fs-12 text-dark text-truncate w-100 px-1">{file.name}</span>
            {!disabled ? (
              <button type="button" className="btn btn-link btn-sm text-danger p-0 mt-1" onClick={handleRemove}>
                Remove
              </button>
            ) : null}
          </>
        ) : (
          <>
            <i className="ti ti-camera fs-28 text-muted mb-2" aria-hidden />
            <span className="fs-13 text-muted lh-sm px-1">{placeholder}</span>
          </>
        )}
      </div>
      {!hasImage && (
        <>
          <span className="fw-semibold text-dark fs-14 mt-1 mb-0">{label}</span>
          <span className="text-muted fs-12 mb-0">{hint}</span>
        </>
      )}
      {hasImage && !disabled && (
        <button type="button" className="btn btn-link btn-sm text-danger p-0 mt-1 align-self-center" onClick={handleRemove}>
          Remove
        </button>
      )}
    </div>
  );
};

export default IpdPatientCompactUpload;
