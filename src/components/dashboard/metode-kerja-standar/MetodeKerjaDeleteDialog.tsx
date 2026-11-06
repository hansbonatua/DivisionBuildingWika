"use client";

import { useEffect, useId, useRef, useState } from "react";

// Confirmation dialog for deleting one MKS sub-kategori or item.
//
// The DELETE request lives here so a 409 ("sub-kategori masih memiliki item")
// can be shown inside the dialog without closing it: the user keeps the
// context and can fix the child items first. Success is reported to the page,
// which closes the dialog and refetches.

async function readDeleteError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: { message?: string };
    };
    if (body.error?.message && body.error.message.trim() !== "") {
      return body.error.message;
    }
  } catch {
    /* non-JSON error body */
  }
  if (response.status === 401) {
    return "Sesi Anda berakhir. Silakan masuk kembali.";
  }
  if (response.status === 403) {
    return "Hanya Admin yang dapat menghapus data Metode Kerja Standar.";
  }
  if (response.status === 404) {
    return "Data sudah tidak tersedia. Muat ulang halaman.";
  }
  return "Gagal menghapus data. Silakan coba lagi.";
}

export default function MetodeKerjaDeleteDialog({
  kind,
  id,
  kode,
  nama,
  itemCount = 0,
  onCancel,
  onDeleted,
}: {
  kind: "sub-kategori" | "item";
  id: string;
  kode: string;
  nama: string;
  itemCount?: number;
  onCancel: () => void;
  onDeleted: (message: string) => void;
}) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = kind === "sub-kategori" ? "sub-kategori" : "item";

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
      const endpoint =
        kind === "sub-kategori"
          ? `/api/metode-kerja-standar/sub-kategori/${id}`
          : `/api/metode-kerja-standar/item/${id}`;
      const response = await fetch(endpoint, { method: "DELETE" });
      if (!response.ok) {
        setError(await readDeleteError(response));
        return;
      }
      onDeleted(`${label === "item" ? "Item" : "Sub-kategori"} berhasil dihapus.`);
    } catch {
      setError("Gagal menghapus data. Periksa koneksi lalu coba lagi.");
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
        aria-labelledby={titleId}
        className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="border-b border-outline bg-red-50/60 px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-red-700">
            Konfirmasi Hapus
          </p>
          <h2 id={titleId} className="mt-0.5 text-lg font-bold text-primary">
            Hapus {label} ini?
          </h2>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="rounded-xl border border-outline/60 bg-background/50 px-4 py-3">
            <p className="font-mono text-[11px] font-bold text-primary/60">{kode}</p>
            <p className="mt-0.5 text-sm font-bold text-primary">{nama}</p>
          </div>

          <p className="text-[11px] leading-relaxed text-primary/70">
            {kind === "sub-kategori"
              ? itemCount > 0
                ? `Sub-kategori ini masih memiliki ${itemCount} item, sehingga penghapusan akan ditolak. Hapus atau pindahkan item tersebut terlebih dahulu.`
                : "Sub-kategori dan seluruh PIC-nya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
              : "Item, seluruh PIC item, dan evidence-nya akan dihapus permanen. Sub-kategori induk tidak ikut terhapus."}
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
