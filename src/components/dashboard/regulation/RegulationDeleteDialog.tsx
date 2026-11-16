"use client";

import { useId, useState } from "react";
import RegulationDialogShell from "@/components/dashboard/regulation/RegulationDialogShell";
import { readRegulationApiError } from "@/components/dashboard/regulation/regulation-ui";

// Confirmation dialog for deleting one sub-kategori or document. A 409 stays
// inside the dialog so the user can see that a sub-kategori still has documents
// and fix it before trying again.

export default function RegulationDeleteDialog({
  kind,
  id,
  kode,
  nama,
  documentCount = 0,
  onCancel,
  onDeleted,
}: {
  kind: "sub-kategori" | "document";
  id: string;
  kode: string;
  nama: string;
  documentCount?: number;
  onCancel: () => void;
  onDeleted: (message: string) => void;
}) {
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = kind === "sub-kategori" ? "sub-kategori" : "dokumen";

  async function handleDelete(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const endpoint =
        kind === "sub-kategori"
          ? `/api/regulation/sub-kategori/${id}`
          : `/api/regulation/document/${id}`;
      const response = await fetch(endpoint, { method: "DELETE" });
      if (!response.ok) {
        setError(
          await readRegulationApiError(
            response,
            `Gagal menghapus ${label}. Silakan coba lagi.`,
          ),
        );
        return;
      }
      onDeleted(
        kind === "sub-kategori"
          ? "Sub-kategori berhasil dihapus."
          : "Dokumen berhasil dihapus.",
      );
    } catch {
      setError(
        `Gagal menghapus ${label}. Periksa koneksi lalu coba lagi.`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <RegulationDialogShell
      titleId={titleId}
      eyebrow="Konfirmasi Hapus"
      title={`Hapus ${label} ini?`}
      description="Tindakan ini tidak dapat dibatalkan."
      busy={busy}
      maxWidthClass="max-w-md"
      closeLabel="Tutup konfirmasi"
      onClose={onCancel}
    >
      <div className="space-y-3 px-5 py-4">
        <div className="rounded-xl border border-outline/60 bg-background/50 px-4 py-3">
          <p className="font-mono text-[11px] font-bold text-primary/60">
            {kode}
          </p>
          <p className="mt-0.5 text-sm font-bold text-primary">{nama}</p>
        </div>

        <p className="text-[11px] leading-relaxed text-primary/70">
          {kind === "sub-kategori"
            ? documentCount > 0
              ? `Sub-kategori ini masih memiliki ${documentCount} dokumen. Penghapusan akan ditolak sampai seluruh dokumen di dalamnya dihapus terlebih dahulu.`
              : "Sub-kategori akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
            : "Dokumen dan filenya akan dihapus permanen. Sub-kategori induk tidak ikut terhapus."}
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
          type="button"
          onClick={onCancel}
          disabled={busy}
          data-autofocus="true"
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
    </RegulationDialogShell>
  );
}
