"use client";

import { useCallback, useRef, useState } from "react";
import OrganizationStructureDialog from "./OrganizationStructureDialog";

// Inline preview of the organization chart, shared by every role.
//
// The chart is rendered object-contain inside a white box so portrait and
// landscape charts are never cropped or stretched, and clicking the image or
// the button opens the fullscreen overlay. Focus returns to the trigger when the
// overlay closes, so keyboard users are not dropped back at the top of the page.
export default function OrganizationStructureViewer({
  imageUrl,
  fileName,
}: {
  imageUrl: string;
  fileName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((): void => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const altText = fileName
    ? `Struktur organisasi ${fileName}`
    : "Struktur organisasi";

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka struktur organisasi layar penuh"
          className="block w-full cursor-zoom-in bg-white p-2 transition-colors hover:bg-slate-50 sm:p-3"
        >
          <img
            src={imageUrl}
            alt={altText}
            className="mx-auto h-auto max-h-[70vh] w-full object-contain"
          />
        </button>
      </div>

      <div className="flex justify-center">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-outline bg-white px-4 py-2 text-xs font-bold text-primary shadow-sm transition-colors hover:bg-slate-50"
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
            <path d="M15 3h6v6" />
            <path d="M9 21H3v-6" />
            <path d="M21 3l-7 7" />
            <path d="M3 21l7-7" />
          </svg>
          <span>Lihat Fullscreen</span>
        </button>
      </div>

      {open ? (
        <OrganizationStructureDialog
          imageUrl={imageUrl}
          fileName={fileName}
          onClose={close}
        />
      ) : null}
    </div>
  );
}
