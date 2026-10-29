"use client";

import { useEffect, useRef, useState } from "react";

// Fullscreen viewer for the organization chart.
//
// Deliberately dependency-free: a fixed overlay, a zoom percentage and native
// scrolling. No pan/pinch library, no dialog library.
//
// Zoom is applied by sizing the image box (width: N%) instead of
// `transform: scale()`. A transform grows nothing in layout, so `overflow: auto`
// could not pan the enlarged chart — and with `transform-origin: center` the
// left/top overflow is unreachable in LTR, which would silently crop the chart
// at high zoom. Sizing the box keeps every requirement (50% floor, 300% ceiling,
// 25% steps, Reset, no crop) while making the whole chart reachable.

const ZOOM_MIN_PERCENT = 50;
const ZOOM_MAX_PERCENT = 300;
const ZOOM_STEP_PERCENT = 25;

export default function OrganizationStructureDialog({
  imageUrl,
  fileName,
  onClose,
}: {
  imageUrl: string;
  fileName: string | null;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(100);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const zoomIn = (): void =>
    setZoom((current) => Math.min(ZOOM_MAX_PERCENT, current + ZOOM_STEP_PERCENT));
  const zoomOut = (): void =>
    setZoom((current) => Math.max(ZOOM_MIN_PERCENT, current - ZOOM_STEP_PERCENT));

  // Mount-only: move focus into the overlay and lock background scrolling for
  // as long as it is open.
  useEffect(() => {
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Kept separate from the mount effect: re-subscribing is harmless, whereas
  // folding it in would re-focus the close button whenever `onClose` changed.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const altText = fileName
    ? `Struktur organisasi ${fileName}`
    : "Struktur organisasi";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Struktur organisasi layar penuh"
      className="fixed inset-0 z-[100] flex flex-col bg-slate-950/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-900/80 px-3 py-2 sm:px-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= ZOOM_MIN_PERCENT}
            aria-label="Perkecil"
            className="h-8 w-8 rounded border border-white/20 text-sm font-bold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>
          <span
            aria-live="polite"
            className="min-w-[3.5rem] rounded bg-white/10 px-2 py-1 text-center text-xs font-bold tabular-nums text-white"
          >
            {zoom}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= ZOOM_MAX_PERCENT}
            aria-label="Perbesar"
            className="h-8 w-8 rounded border border-white/20 text-sm font-bold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom(100)}
            disabled={zoom === 100}
            className="ml-1 rounded border border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset
          </button>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded bg-white px-3 py-1.5 text-xs font-bold text-slate-900 transition-colors hover:bg-slate-200"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
          <span>Tutup</span>
        </button>
      </div>

      <div
        className="min-h-0 flex-1 overflow-auto p-3 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Width drives the zoom; the image keeps its own aspect ratio. */}
        <div
          className="mx-auto"
          style={{ width: `${zoom}%`, maxWidth: zoom > 100 ? "none" : undefined }}
        >
          <img
            src={imageUrl}
            alt={altText}
            className="block h-auto w-full rounded bg-white object-contain shadow-2xl"
            style={
              zoom <= 100 ? { maxHeight: "calc(100dvh - 7rem)" } : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
