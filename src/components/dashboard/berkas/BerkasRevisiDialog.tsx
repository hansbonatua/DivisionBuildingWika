"use client";

import { useEffect, useId, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  BERKAS_UPLOAD_TOKEN_URL,
  PDF_MAX_BYTES,
  buildOriginalUploadPath,
  getPdfPageCount,
  readApiErrorMessage,
} from "@/components/dashboard/berkas/client";
import {
  formatBerkasSize,
  type BerkasDto,
} from "@/components/dashboard/berkas/types";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

export default function BerkasRevisiDialog({
  berkas,
  actorId,
  onClose,
  onSaved,
}: {
  berkas: BerkasDto;
  actorId: string;
  onClose: () => void;
  onSaved: (record: BerkasDto) => void;
}) {
  const titleId = useId();
  const fileId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose]);

  function handleTab(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleFileChange(next: File | null): void {
    setError(null);
    if (!next) return;
    if (!isPdfFile(next)) {
      setError("File revisi harus berformat PDF.");
      return;
    }
    if (next.size <= 0 || next.size > PDF_MAX_BYTES) {
      setError("Ukuran PDF harus lebih dari 0 dan maksimal 20 MB.");
      return;
    }
    setPdfFile(next);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (busy) return;
    if (!pdfFile) {
      setError("Pilih PDF revisi terlebih dahulu.");
      return;
    }

    setBusy(true);
    setError(null);
    setProgress(0);

    try {
      const pageCount = await getPdfPageCount(pdfFile);
      if (pageCount < 1 || pageCount > 200) {
        throw new Error("PDF harus memiliki 1–200 halaman.");
      }

      const uploadId = crypto.randomUUID();
      const pathname = buildOriginalUploadPath(actorId, uploadId);
      const uploaded = await upload(pathname, pdfFile, {
        access: "private",
        handleUploadUrl: BERKAS_UPLOAD_TOKEN_URL,
        clientPayload: JSON.stringify({ kind: "original", uploadId }),
        contentType: "application/pdf",
        onUploadProgress: ({ percentage }) => {
          setProgress(Math.max(5, Math.round(percentage * 0.9)));
        },
      });

      setProgress(95);
      const response = await fetch(`/api/berkas/${berkas.id}/revisi`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPdfPathname: uploaded.pathname,
          fileName: pdfFile.name,
        }),
      });
      if (!response.ok) {
        throw new Error(
          await readApiErrorMessage(response, "Gagal mengirim revisi Berkas."),
        );
      }
      const body = (await response.json()) as { data?: BerkasDto };
      if (!body.data) throw new Error("Respons revisi tidak valid.");
      setProgress(100);
      onSaved(body.data);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Gagal mengirim revisi Berkas. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleTab}
        className="flex max-h-[100dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline bg-background/60 px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-red-700">
              Berkas Ditolak
            </p>
            <h2 id={titleId} className="mt-0.5 text-lg font-bold text-primary">
              Revisi Berkas
            </h2>
            <p className="mt-0.5 line-clamp-2 text-xs text-primary/55">
              {berkas.judul}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Tutup form revisi"
            className="rounded-lg p-2 text-primary/50 transition-colors hover:bg-white hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              width="18"
              height="18"
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
          </button>
        </div>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-red-700">
                Alasan penolakan
              </p>
              <p className="mt-1 text-xs leading-relaxed text-red-800">
                {berkas.rejectionReason?.trim() || "Alasan tidak tersedia."}
              </p>
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs font-semibold text-red-700"
              >
                {error}
              </div>
            ) : null}

            <div>
              <span className={labelClass}>
                PDF pengganti <span className="text-red-600">*</span>
              </span>
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M8 13h8" />
                  <path d="M8 17h5" />
                </svg>
                <span className="text-xs font-bold text-primary">
                  {pdfFile ? pdfFile.name : "Pilih PDF revisi"}
                </span>
                <span className="mt-1 text-[11px] text-primary/50">
                  {pdfFile
                    ? formatBerkasSize(pdfFile.size)
                    : "Maksimal 20 MB, 1–200 halaman"}
                </span>
              </label>
              <input
                id={fileId}
                type="file"
                accept="application/pdf,.pdf"
                disabled={busy}
                onChange={(event) =>
                  handleFileChange(event.target.files?.[0] ?? null)
                }
                className="sr-only"
              />
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] leading-relaxed text-amber-800">
              Mengirim revisi akan mengganti PDF lama dan mengulang proses TTD
              dari Validator 1. TTD validator sebelumnya tidak berlaku lagi.
            </div>

            {busy && progress !== null ? (
              <div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-secondary transition-[width] duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] font-medium text-primary/55">
                  Mengunggah dan menyimpan revisi... {progress}%
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-outline bg-background/40 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-outline bg-white px-4 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-secondary px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Mengirim..." : "Kirim Revisi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
