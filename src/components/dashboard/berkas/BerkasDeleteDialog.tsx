"use client";

import { useEffect, useRef, useState } from "react";
import { readApiErrorMessage } from "@/components/dashboard/berkas/client";
import type { BerkasDto } from "@/components/dashboard/berkas/types";

// Confirmation dialog for the Admin-only Berkas delete. The DELETE request
// lives here so a 403/404 stays visible inside the dialog; the page only
// receives the success callback and removes the row locally.

export default function BerkasDeleteDialog({
  berkas,
  onCancel,
  onDeleted,
}: {
  berkas: BerkasDto;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    cancelRef.current?.focus();
    return () => {
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onCancel();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [busy, onCancel]);

  async function handleDelete(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/berkas/${berkas.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setError(
          await readApiErrorMessage(response, "Gagal menghapus Berkas."),
        );
        return;
      }
      onDeleted();
    } catch {
      setError("Gagal menghapus Berkas. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="berkas-delete-title"
        className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="border-b border-outline bg-red-50/60 px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-red-700">
            Konfirmasi Hapus
          </p>
          <h2 id="berkas-delete-title" className="mt-0.5 text-lg font-bold text-primary">
            Hapus berkas ini?
          </h2>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="rounded-xl border border-outline/60 bg-background/50 px-4 py-3">
            <p className="text-sm font-bold text-primary">{berkas.judul}</p>
            <p className="mt-1 text-[11px] font-medium text-primary/50">
              {berkas.originalPdf.name}
            </p>
          </div>

          <p className="text-[11px] leading-relaxed text-primary/70">
            Yakin ingin menghapus berkas ini? PDF asli, PDF final, dan seluruh
            gambar TTD akan dihapus permanen. Tindakan ini tidak dapat
            dibatalkan.
          </p>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-outline bg-background/40 px-5 py-3.5">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-outline bg-white px-4 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={busy}
            className="rounded-lg bg-red-700 px-5 py-2.5 text-xs font-bold text-white shadow transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Menghapus..." : "Hapus Permanen"}
          </button>
        </div>
      </div>
    </div>
  );
}
