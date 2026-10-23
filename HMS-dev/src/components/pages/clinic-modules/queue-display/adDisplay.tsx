"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Maximize, Minimize } from "tabler-icons-react";

const AdDisplayComponent = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-100 d-flex flex-column bg-white position-relative"
      style={{ minHeight: "100vh", height: "100vh" }}
    >
      {/* Fullscreen toggle */}
      <button
        type="button"
        onClick={toggleFullscreen}
        className="position-fixed top-0 end-0 m-3 btn btn-light btn-lg shadow border d-flex align-items-center justify-content-center rounded-circle p-1 z-3"
        style={{ width: "clamp(40px, 3vw, 60px)", height: "clamp(40px, 3vw, 60px)" }}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
      </button>

      {/* Header */}
      <div className="bg-white border-bottom py-2 px-3 px-md-4 px-lg-5 d-flex align-items-center w-100">
        <img
          src="/JJM Logo.png"
          alt="JJM Hospital"
          className="flex-shrink-0 me-3"
          style={{ height: "clamp(40px, 4vw, 150px)", width: "auto", objectFit: "contain" }}
        />
        <h1
          className="mb-0 fw-bold text-dark flex-grow-1 text-center"
          style={{ fontSize: "clamp(1rem, 2vw, 6rem)" }}
        >
          JJM Hospital
        </h1>
      </div>

      {/* Sub-header banner */}
      <div
        className="bg-primary text-white py-1 px-3 px-md-4 px-lg-5 text-center w-100"
        style={{ fontSize: "clamp(0.75rem, 1.2vw, 3rem)" }}
      >
        <span className="text-nowrap">
          Critical Patients will be given priority in Queue
        </span>
      </div>

      {/* Blank content area */}
      <div className="flex-grow-1" />
    </div>
  );
};

export default AdDisplayComponent;
