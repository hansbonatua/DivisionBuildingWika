"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import SignaturePad, { type PointGroup } from "signature_pad";
import { TTD_MAX_BYTES } from "@/components/dashboard/berkas/client";

// Reusable TTD input: upload an image file, or draw directly on a canvas.
// The component owns no network code. It only validates the chosen image and
// hands a PNG File to the parent through onChange, so both callers (Ajukan and
// Verifikasi) can upload it with the existing private-Blob flow.

export type BerkasSignatureMode = "upload" | "draw";

export type BerkasSignatureFieldProps = {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  label?: string;
  error?: string | null;
  defaultMode?: BerkasSignatureMode;
  idPrefix?: string;
};

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

const secondaryButtonClass =
  "rounded-lg border border-outline bg-white px-3 py-2 text-[11px] font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50";

/** PNG/JPEG by MIME type, with an extension fallback for files without one. */
export function isSignatureImageFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return (
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg")
  );
}

/** Returns a user-facing message, or null when the file is acceptable. */
export function validateSignatureImageFile(file: File): string | null {
  if (!isSignatureImageFile(file)) {
    return "TTD harus berupa gambar PNG atau JPG.";
  }
  if (file.size <= 0 || file.size > TTD_MAX_BYTES) {
    return "Ukuran TTD maksimal 2 MB.";
  }
  return null;
}

/** Converts the pad's PNG data URL into a File the upload flow can consume. */
export async function signatureFileFromDataUrl(dataUrl: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], `ttd-${Date.now()}.png`, { type: "image/png" });
}

export default function BerkasSignatureField({
  value,
  onChange,
  disabled = false,
  label = "Tanda Tangan",
  error = null,
  defaultMode = "upload",
  idPrefix,
}: BerkasSignatureFieldProps) {
  const generatedId = useId();
  const baseId = idPrefix ?? generatedId;
  const fileId = `${baseId}-file`;
  const uploadTabId = `${baseId}-tab-upload`;
  const drawTabId = `${baseId}-tab-draw`;
  const uploadPanelId = `${baseId}-panel-upload`;
  const drawPanelId = `${baseId}-panel-draw`;
  const messageId = `${baseId}-message`;

  const [mode, setMode] = useState<BerkasSignatureMode>(defaultMode);
  const [padEmpty, setPadEmpty] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const resizeTimerRef = useRef<number | null>(null);
  const historyRef = useRef<PointGroup[][]>([]);
  const onChangeRef = useRef(onChange);
  const isInternalChangeRef = useRef(false);
  const lastEmittedRef = useRef<File | null | undefined>(undefined);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Marks the next `value` prop update as the echo of our own onChange, so the
  // parent-driven sync below never clears what the user just chose.
  const notifyChange = useCallback((file: File | null) => {
    lastEmittedRef.current = file;
    isInternalChangeRef.current = true;
    onChangeRef.current(file);
    // Safety net for a parent that ignores the callback (no re-render).
    setTimeout(() => {
      isInternalChangeRef.current = false;
    }, 0);
  }, []);

  // The preview is derived from the controlled `value` prop; the object URL is
  // revoked when the value changes or the field unmounts.
  const previewUrl = useMemo(() => {
    if (!value || typeof URL.createObjectURL !== "function") return null;
    return URL.createObjectURL(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Parent-driven sync (F-S1-3): a parent reset clears the pad without echoing
  // another onChange. The echo of our own emit is ignored, and padEmpty is
  // derived from `value` below so no state write is needed here.
  useEffect(() => {
    const isEcho =
      isInternalChangeRef.current && Object.is(value, lastEmittedRef.current);
    isInternalChangeRef.current = false;
    if (isEcho) return;
    if (value === null) {
      padRef.current?.clear();
      historyRef.current = [];
    }
  }, [value]);

  useEffect(() => {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pad = new SignaturePad(canvas, { penColor: "#000000" });
    padRef.current = pad;
    historyRef.current = [];

    // signature_pad does not size the bitmap for high-DPI screens, so the
    // backing store is scaled by devicePixelRatio and the context is scaled to
    // match. Any existing strokes are replayed after the resize.
    function applySize(): void {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cssWidth = rect.width || canvas.clientWidth;
      const cssHeight = rect.height || canvas.clientHeight;
      if (cssWidth <= 0 || cssHeight <= 0) return;

      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const data = pad.isEmpty() ? null : pad.toData();

      canvas.width = Math.round(cssWidth * ratio);
      canvas.height = Math.round(cssHeight * ratio);
      const context = canvas.getContext("2d");
      if (context) context.scale(ratio, ratio);

      pad.clear();
      if (data && data.length > 0) pad.fromData(data);
      setPadEmpty(pad.isEmpty());
    }

    async function commit(): Promise<void> {
      if (pad.isEmpty()) {
        setPadEmpty(true);
        notifyChange(null);
        return;
      }

      setPadEmpty(false);
      try {
        const file = await signatureFileFromDataUrl(pad.toDataURL("image/png"));
        if (file.size > TTD_MAX_BYTES) {
          setLocalError("TTD terlalu besar. Hapus lalu tanda tangan ulang.");
          notifyChange(null);
          return;
        }
        historyRef.current.push(pad.toData());
        setLocalError(null);
        notifyChange(file);
      } catch {
        setLocalError("Gagal memproses gambar TTD. Coba ulangi tanda tangan.");
        notifyChange(null);
      }
    }

    function handleEnd(): void {
      void commit();
    }

    function handleResize(): void {
      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current);
      }
      resizeTimerRef.current = window.setTimeout(() => {
        resizeTimerRef.current = null;
        applySize();
      }, 150);
    }

    applySize();
    // signature_pad 5.x dispatches "endStroke" (not "end"); listening to the
    // wrong name meant the drawing was never converted into a File, so the
    // parent stayed empty and Undo never enabled.
    pad.addEventListener("endStroke", handleEnd);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
      pad.off();
      padRef.current = null;
      historyRef.current = [];
    };
  }, [mode, notifyChange]);

  function handleModeChange(next: BerkasSignatureMode): void {
    if (disabled || next === mode) return;
    padRef.current?.clear();
    historyRef.current = [];
    setMode(next);
    setPadEmpty(true);
    setLocalError(null);
    notifyChange(null);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const next = event.target.files?.[0] ?? null;
    setLocalError(null);

    if (!next) {
      notifyChange(null);
      return;
    }

    const validationError = validateSignatureImageFile(next);
    if (validationError) {
      setLocalError(validationError);
      notifyChange(null);
      return;
    }

    notifyChange(next);
  }

  async function handleUndo(): Promise<void> {
    const pad = padRef.current;
    if (!pad) return;

    // F-S1-1: signature_pad 5.1.7 has no undo() on its prototype, so the
    // previous snapshot is replayed with fromData({ clear: true }) instead.
    historyRef.current.pop();
    const previous = historyRef.current[historyRef.current.length - 1] ?? [];
    pad.fromData(previous, { clear: true });

    const empty = pad.isEmpty();
    setPadEmpty(empty);
    if (empty) {
      notifyChange(null);
      return;
    }
    try {
      notifyChange(await signatureFileFromDataUrl(pad.toDataURL("image/png")));
    } catch {
      notifyChange(null);
    }
  }

  function handleClear(): void {
    const pad = padRef.current;
    if (!pad) return;
    pad.clear();
    historyRef.current = [];
    setPadEmpty(true);
    setLocalError(null);
    notifyChange(null);
  }

  const message = error ?? localError;
  const isPadEmpty = value === null ? true : padEmpty;
  const tabClass = (active: boolean): string =>
    `flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
      active
        ? "bg-secondary text-white"
        : "bg-transparent text-primary hover:bg-background"
    }`;

  return (
    <div>
      <span className={labelClass}>{label}</span>

      <div
        role="tablist"
        aria-label={`${label} — pilih metode`}
        className="inline-flex w-full gap-1 rounded-lg border border-outline bg-white p-1"
      >
        <button
          type="button"
          role="tab"
          id={uploadTabId}
          aria-selected={mode === "upload"}
          aria-controls={uploadPanelId}
          disabled={disabled}
          onClick={() => handleModeChange("upload")}
          className={tabClass(mode === "upload")}
        >
          Upload File
        </button>
        <button
          type="button"
          role="tab"
          id={drawTabId}
          aria-selected={mode === "draw"}
          aria-controls={drawPanelId}
          disabled={disabled}
          onClick={() => handleModeChange("draw")}
          className={tabClass(mode === "draw")}
        >
          Gambar TTD
        </button>
      </div>

      {mode === "upload" ? (
        <div
          id={uploadPanelId}
          role="tabpanel"
          aria-labelledby={uploadTabId}
          className="mt-3"
        >
          <label
            htmlFor={fileId}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-outline bg-background/40 px-4 py-6 text-center transition-colors hover:border-secondary/60 hover:bg-blue-50/40"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-2 text-secondary"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
            <span className="text-xs font-bold text-primary">
              {value ? value.name : "Pilih gambar TTD"}
            </span>
            <span className="mt-1 text-[11px] text-primary/50">
              PNG/JPG, maksimal 2 MB
            </span>
          </label>
          <input
            id={fileId}
            type="file"
            accept="image/png,image/jpeg,.png,.jpg,.jpeg"
            disabled={disabled}
            onChange={handleFileChange}
            aria-invalid={Boolean(message)}
            aria-describedby={message ? messageId : undefined}
            className="sr-only"
          />
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Pratinjau TTD"
              className="mt-3 h-24 w-full rounded-xl border border-outline bg-white object-contain p-2"
            />
          ) : null}
        </div>
      ) : (
        <div
          id={drawPanelId}
          role="tabpanel"
          aria-labelledby={drawTabId}
          className="mt-3"
        >
          <canvas
            ref={canvasRef}
            aria-label="Area tanda tangan"
            aria-describedby={message ? messageId : undefined}
            tabIndex={0}
            className="w-full aspect-[3/1] rounded-xl border border-outline bg-white"
            style={{ touchAction: "none", backgroundColor: "#ffffff" }}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-primary/50">
              {isPadEmpty
                ? "Gambar tanda tangan pada area di atas."
                : "Tanda tangan siap disimpan."}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                disabled={disabled}
                className={secondaryButtonClass}
              >
                Hapus
              </button>
              <button
                type="button"
                onClick={() => void handleUndo()}
                disabled={disabled || isPadEmpty}
                className={secondaryButtonClass}
              >
                Undo
              </button>
            </div>
          </div>
        </div>
      )}

      {message ? (
        <p
          id={messageId}
          role="alert"
          className="mt-2 text-[11px] font-semibold text-red-700"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
