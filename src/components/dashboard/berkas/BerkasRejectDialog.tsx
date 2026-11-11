"use client";

import { useEffect, useId, useRef, useState } from "react";
import { readApiErrorMessage } from "@/components/dashboard/berkas/client";
import type { BerkasDto } from "@/components/dashboard/berkas/types";

export default function BerkasRejectDialog({
  berkas,
  onClose,
  onSaved,
}: {
  berkas: BerkasDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const titleId = useId();
  const reasonId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
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
      'button:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
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

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (busy) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Alasan penolakan wajib diisi.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/berkas/${berkas.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: trimmed }),
      });
      if (!response.ok) {
        setError(await readApiErrorMessage(response, "Gagal menolak Berkas."));
        return;
      }
      onSaved();
    } catch {
      setError("Gagal menolak Berkas. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
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
        className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="border-b border-outline bg-red-50/70 px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-red-700">
            Konfirmasi Penolakan
          </p>
          <h2 id={titleId} className="mt-0.5 text-lg font-bold text-primary">
            Tolak Berkas
          </h2>
          <p className="mt-0.5 line-clamp-2 text-xs text-primary/55">
            {berkas.judul}
          </p>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-4 px-5 py-4">
            <p className="text-[11px] leading-relaxed text-primary/70">
              Berkas akan berstatus DITOLAK dan pengaju harus mengirim PDF
              revisi. TTD yang sudah ada tidak dihapus sampai revisi dikirim.
            </p>

            <div>
              <label
                htmlFor={reasonId}
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Alasan penolakan <span className="text-red-600">*</span>
              </label>
              <textarea
                id={reasonId}
                rows={4}
                maxLength={2000}
                required
                value={reason}
                disabled={busy}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Jelaskan bagian yang harus diperbaiki..."
                className="w-full rounded-lg border border-outline/60 bg-white px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
              <p className="mt-1 text-right text-[11px] text-primary/45">
                {reason.length}/2000
              </p>
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
              >
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-outline bg-background/40 px-5 py-3.5">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-outline bg-white px-4 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-red-700 px-5 py-2.5 text-xs font-bold text-white shadow transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Menolak..." : "Tolak Berkas"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
