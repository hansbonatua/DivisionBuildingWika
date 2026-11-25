"use client";

import { useEffect, useId, useRef, useState } from "react";
import { uploadFile } from "@/lib/storage/upload-client";
import BerkasSignatureField from "@/components/dashboard/berkas/BerkasSignatureField";
import {
  BERKAS_UPLOAD_TOKEN_URL,
  buildValidatorTtdUploadPath,
  readApiErrorMessage,
} from "@/components/dashboard/berkas/client";
import type { BerkasDto } from "@/components/dashboard/berkas/types";

const inputClass =
  "w-full rounded-lg border border-outline/60 bg-white px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

const SIGNATURE_REQUIRED = "Pilih atau gambar TTD terlebih dahulu.";

export default function BerkasTtdDialog({
  berkas,
  urutan,
  onClose,
  onSaved,
}: {
  berkas: BerkasDto;
  urutan: 1 | 2;
  onClose: () => void;
  onSaved: () => void;
}) {
  const titleId = useId();
  const catatanId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [ttdFile, setTtdFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [catatan, setCatatan] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previousFocus =
      window.document.activeElement instanceof HTMLElement
        ? window.document.activeElement
        : null;
    const previousOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.document.body.style.overflow = previousOverflow;
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
    window.document.addEventListener("keydown", handleKeyDown);
    return () => window.document.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose]);

  function handleTab(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && window.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && window.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleSignatureChange(next: File | null): void {
    setTtdFile(next);
    if (next) {
      setFileError(null);
      setError(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy) return;
    if (!ttdFile) {
      setFileError(SIGNATURE_REQUIRED);
      return;
    }

    setBusy(true);
    setError(null);
    setFileError(null);
    setProgress(0);

    try {
      const role = urutan === 1 ? "validasi-1" : "validasi-2";
      const pathname = buildValidatorTtdUploadPath(berkas.id, role, ttdFile);
      const uploaded = await uploadFile(ttdFile, BERKAS_UPLOAD_TOKEN_URL, {
        pathname,
        clientPayload: {
          kind: "validator_ttd",
          berkasId: berkas.id,
          role,
        },
        contentType: ttdFile.type,
        onProgress: (percentage) => {
          setProgress(Math.min(95, Math.round(percentage * 0.95)));
        },
      });

      setProgress(96);
      const response = await fetch(`/api/berkas/${berkas.id}/ttd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ttd: { pathname: uploaded.pathname },
          catatan: catatan.trim() || null,
        }),
      });
      if (!response.ok) {
        throw new Error(
          await readApiErrorMessage(
            response,
            "Gagal menyimpan TTD. Muat ulang data lalu coba lagi.",
          ),
        );
      }
      setProgress(100);
      onSaved();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Gagal menyimpan TTD. Periksa koneksi lalu coba lagi.",
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
            <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">
              Verifikasi Berkas
            </p>
            <h2 id={titleId} className="mt-0.5 text-lg font-bold text-primary">
              Upload TTD Validator {urutan}
            </h2>
            <p className="mt-0.5 line-clamp-2 text-xs text-primary/55">{berkas.judul}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Tutup form TTD"
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

        <form onSubmit={(event) => void handleSubmit(event)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            {error ? (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs font-semibold text-red-700">
                {error}
              </div>
            ) : null}

            <BerkasSignatureField
              value={ttdFile}
              onChange={handleSignatureChange}
              label="Gambar TTD"
              error={fileError}
              disabled={busy}
            />

            <div>
              <label htmlFor={catatanId} className={labelClass}>
                Catatan (opsional)
              </label>
              <textarea
                id={catatanId}
                rows={3}
                maxLength={2000}
                value={catatan}
                disabled={busy}
                onChange={(event) => setCatatan(event.target.value)}
                placeholder="Tambahkan catatan verifikasi bila diperlukan."
                className={inputClass}
              />
              <p className="mt-1 text-right text-[11px] text-primary/45">
                {catatan.length}/2000
              </p>
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
                  Mengunggah TTD... {progress}%
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
              {busy ? "Menyimpan..." : `Simpan TTD ${urutan}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
