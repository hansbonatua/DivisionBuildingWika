"use client";

import { useEffect, useRef, useState } from "react";
import type { KnowledgeRecordDto } from "@/components/dashboard/knowledge-management/types";

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    if (typeof body.error?.message === "string" && body.error.message.trim() !== "") {
      return body.error.message;
    }
  } catch {
    /* non-JSON error body */
  }
  if (response.status === 401) {
    return "Sesi Anda berakhir. Silakan masuk kembali.";
  }
  if (response.status === 403) {
    return "Anda tidak memiliki akses untuk menghapus data ini.";
  }
  if (response.status === 404) {
    return "Data Knowledge Management tidak ditemukan.";
  }
  return fallback;
}

export default function KnowledgeDeleteDialog({
  record,
  onCancel,
  onDeleted,
  onConflict,
}: {
  record: KnowledgeRecordDto;
  onCancel: () => void;
  onDeleted: () => void;
  onConflict: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
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

  function handleTab(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Tab") {
      return;
    }
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) {
      return;
    }
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

  async function handleDelete(): Promise<void> {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/knowledge-management/${record.id}?expected_version=${record.version}`,
        { method: "DELETE" },
      );
      if (response.status === 409) {
        onConflict(
          await readErrorMessage(
            response,
            "Data sudah diubah pengguna lain. Muat ulang data terbaru.",
          ),
        );
        return;
      }
      if (!response.ok) {
        setError(await readErrorMessage(response, "Gagal menghapus Knowledge Management."));
        return;
      }
      const body = (await response.json()) as {
        data?: { deleted?: boolean; id?: string };
      };
      if (!body.data?.deleted) {
        setError("Respons server tidak valid. Muat ulang data terbaru.");
        return;
      }
      onDeleted();
    } catch {
      setError("Gagal menghapus Knowledge Management. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="knowledge-delete-title"
        onKeyDown={handleTab}
        className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
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
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="m19 6-1 14H6L5 6" />
              <path d="M10 11v5" />
              <path d="M14 11v5" />
            </svg>
          </span>
          <div>
            <h2 id="knowledge-delete-title" className="text-base font-bold text-primary">
              Hapus record Knowledge Management?
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-primary/60">
              Record beserta seluruh PIC dan evidence akan dihapus permanen. Master Project
              tidak ikut dihapus. Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-outline/60 bg-background/60 px-3.5 py-3">
          <p className="text-xs font-bold text-primary">{record.project.name}</p>
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-primary/60">
            {record.content}
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
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
            className="rounded-lg bg-red-700 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Menghapus..." : "Hapus Permanen"}
          </button>
        </div>
      </div>
    </div>
  );
}
