"use client";

import { useState } from "react";
import LearningDialogShell from "@/components/dashboard/learning/LearningDialogShell";
import { readLearningApiError } from "@/components/dashboard/learning/api-error";
import {
  LEARNING_TYPE_LABELS,
  type LearningContentListItem,
} from "@/components/dashboard/learning/types";

export default function LearningDeleteDialog({
  record,
  onClose,
  onDeleted,
}: {
  record: LearningContentListItem;
  onClose: () => void;
  onDeleted: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = "learning-delete-title";

  async function handleDelete(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/learning/contents/${record.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(
          await readLearningApiError(response, "Gagal menghapus konten."),
        );
      }
      onDeleted("Konten Building Learning Center berhasil dihapus.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Gagal menghapus konten.",
      );
      setBusy(false);
    }
  }

  return (
    <LearningDialogShell
      titleId={titleId}
      eyebrow={LEARNING_TYPE_LABELS[record.type]}
      title="Hapus Konten"
      description="Tindakan ini tidak dapat dibatalkan."
      busy={busy}
      maxWidthClass="max-w-md"
      closeLabel="Tutup dialog hapus"
      onClose={onClose}
    >
      <div className="space-y-4 px-5 py-5 sm:px-6">
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
          >
            {error}
          </div>
        ) : null}

        <p className="text-sm text-primary/70">
          Hapus{" "}
          <span className="font-bold text-primary">&ldquo;{record.judul}&rdquo;</span>{" "}
          beserta thumbnail dan seluruh lampirannya?
        </p>
        <p className="text-xs text-primary/50">
          Konten akan hilang dari halaman{" "}
          {LEARNING_TYPE_LABELS[record.type]} dan tidak dapat dikembalikan.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-outline bg-background/60 px-5 py-3.5 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-lg border border-outline bg-white px-4 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={busy}
          className="rounded-lg bg-red-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Menghapus..." : "Hapus"}
        </button>
      </div>
    </LearningDialogShell>
  );
}
