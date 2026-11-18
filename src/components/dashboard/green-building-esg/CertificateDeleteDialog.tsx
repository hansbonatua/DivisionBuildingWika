"use client";

import { useId, useState } from "react";
import GreenBuildingEsgDialogShell from "@/components/dashboard/green-building-esg/GreenBuildingEsgDialogShell";
import { readGreenBuildingApiError } from "@/components/dashboard/green-building-esg/api-error";
import type { GreenBuildingCertificate } from "@/components/dashboard/green-building-esg/types";

export default function CertificateDeleteDialog({
  record,
  onCancel,
  onDeleted,
}: {
  record: GreenBuildingCertificate;
  onCancel: () => void;
  onDeleted: (message: string) => void;
}) {
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/green-building-esg/certificates/${record.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        setError(
          await readGreenBuildingApiError(
            response,
            "Gagal menghapus sertifikat. Silakan coba lagi.",
          ),
        );
        return;
      }
      onDeleted("Sertifikat berhasil dihapus.");
    } catch {
      setError("Gagal menghapus sertifikat. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <GreenBuildingEsgDialogShell
      titleId={titleId}
      eyebrow="Konfirmasi Hapus"
      title="Hapus sertifikat ini?"
      description="Tindakan ini tidak dapat dibatalkan."
      busy={busy}
      maxWidthClass="max-w-md"
      closeLabel="Tutup konfirmasi"
      onClose={onCancel}
    >
      <div className="space-y-3 px-5 py-4">
        <div className="rounded-xl border border-outline/60 bg-background/50 px-4 py-3">
          <p className="text-sm font-bold text-primary">
            {record.project.name}
          </p>
          <p className="mt-0.5 text-[11px] text-primary/60">
            {record.project.location} · {record.certificate_year} ·{" "}
            {record.lembaga} {record.level}
          </p>
        </div>

        <p className="text-[11px] leading-relaxed text-primary/70">
          Data sertifikat akan dihapus permanen. Tautan dokumentasi tidak
          disimpan sebagai file, sehingga tidak ada file yang perlu dihapus.
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
    </GreenBuildingEsgDialogShell>
  );
}
