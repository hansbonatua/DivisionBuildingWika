"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import CstTable from "@/components/dashboard/calculation-sheet-template/CstTable";
import {
  EMPTY_CST_DRAFT,
  draftEquals,
  draftToCreatePayload,
  draftToUpdatePayload,
  isEmptyDraft,
  toCstDraft,
  validateCstDraft,
  type CstCreatingState,
  type CstDraft,
  type CstEditingState,
  type CstPicDto,
  type CstTemplateRow,
} from "@/lib/calculation-sheet-template/cst-draft";
import type { CstCategory } from "@/lib/calculation-sheet-template/constants";

// Calculation Sheet Template category page (single category, inline editing).
//
// Rows come from GET /api/calculation-sheet-template?kategori=<id>, so the page
// only ever holds its own category. After a successful mutation the row
// returned by the API replaces local state — no refetch, no optimistic update.
// At most ONE saved row is in edit and ONE create draft exists at a time.

type Feedback = { kind: "success" | "error"; message: string };

async function readApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
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
    return "Anda tidak memiliki akses untuk mengubah Calculation Sheet Template.";
  }
  if (response.status === 409) {
    return "Data berubah di tempat lain. Muat ulang lalu coba lagi.";
  }
  return fallback;
}

export default function CalculationSheetTemplatePage({
  kategori,
  canManage,
}: {
  kategori: CstCategory;
  canManage: boolean;
}) {
  const [rows, setRows] = useState<CstTemplateRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [editing, setEditing] = useState<CstEditingState | null>(null);
  const [creating, setCreating] = useState<CstCreatingState | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [picOptions, setPicOptions] = useState<CstPicDto[]>([]);
  const [picLoading, setPicLoading] = useState(false);
  const [picError, setPicError] = useState<string | null>(null);
  const picLoadedRef = useRef(false);

  const requestIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let active = true;

    async function loadRows(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/calculation-sheet-template?kategori=${encodeURIComponent(kategori.id)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const body = (await response.json()) as {
          data?: { rows?: CstTemplateRow[] };
        };
        if (!body.data || !Array.isArray(body.data.rows)) {
          throw new Error("INVALID_RESPONSE");
        }
        if (!active || requestId !== requestIdRef.current) return;
        setRows(body.data.rows);
      } catch {
        if (!active || controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        setError(
          "Gagal memuat Calculation Sheet Template. Periksa koneksi lalu coba lagi.",
        );
      } finally {
        if (active && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }

    void loadRows();
    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken, kategori.id]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  // PIC options are only needed while editing/creating. Fetch once per page
  // visit; a failure leaves the select disabled with an inline message.
  useEffect(() => {
    if (!canManage || (editing === null && creating === null) || picLoadedRef.current) {
      return;
    }
    const controller = new AbortController();
    let active = true;

    async function loadPicOptions(): Promise<void> {
      setPicLoading(true);
      setPicError(null);
      try {
        const response = await fetch("/api/calculation-sheet-template/pic-options", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const body = (await response.json()) as { data?: CstPicDto[] };
        if (!Array.isArray(body.data)) {
          throw new Error("INVALID_RESPONSE");
        }
        if (!active) return;
        setPicOptions(body.data);
        picLoadedRef.current = true;
      } catch {
        if (!active || controller.signal.aborted) return;
        setPicError("Gagal memuat daftar PIC.");
      } finally {
        if (active) setPicLoading(false);
      }
    }

    void loadPicOptions();
    return () => {
      active = false;
      controller.abort();
    };
  }, [canManage, editing, creating]);

  const dirty =
    (editing !== null && !draftEquals(editing.draft, editing.initial)) ||
    (creating !== null && !isEmptyDraft(creating.draft));

  useEffect(() => {
    if (!dirty) return;
    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const confirmDiscard = useCallback((label: string): boolean => {
    if (!dirty) return true;
    return window.confirm(`Perubahan belum disimpan. ${label} dan buang perubahan?`);
  }, [dirty]);

  function startEdit(row: CstTemplateRow): void {
    if (!canManage || busy) return;
    if (!confirmDiscard("Edit baris lain")) return;
    const initial = toCstDraft(row);
    setCreating(null);
    setEditing({ id: row.id, draft: { ...initial }, initial, error: null });
    setFeedback(null);
  }

  function startCreate(): void {
    if (!canManage || busy) return;
    if (!confirmDiscard("Tambah baris")) return;
    setEditing(null);
    setCreating({ kategori: kategori.id, draft: { ...EMPTY_CST_DRAFT }, error: null });
    setFeedback(null);
  }

  function cancelEdit(): void {
    if (busy) return;
    if (!confirmDiscard("Batalkan edit")) return;
    setEditing(null);
  }

  function cancelCreate(): void {
    if (busy) return;
    if (!confirmDiscard("Batalkan tambah baris")) return;
    setCreating(null);
  }

  function editDraftChange(patch: Partial<CstDraft>): void {
    setEditing((previous) =>
      previous
        ? { ...previous, draft: { ...previous.draft, ...patch }, error: null }
        : previous,
    );
  }

  function createDraftChange(patch: Partial<CstDraft>): void {
    setCreating((previous) =>
      previous
        ? { ...previous, draft: { ...previous.draft, ...patch }, error: null }
        : previous,
    );
  }

  async function saveEdit(): Promise<void> {
    if (!editing || busy) return;
    const validation = validateCstDraft(editing.draft);
    if (validation) {
      setEditing({ ...editing, error: validation.message });
      return;
    }
    const payload = draftToUpdatePayload(editing.draft);
    if (!payload) {
      setEditing({ ...editing, error: "Data belum valid." });
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(
        `/api/calculation-sheet-template/${encodeURIComponent(editing.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const message = await readApiErrorMessage(response, "Gagal menyimpan perubahan.");
        setEditing((previous) => (previous ? { ...previous, error: message } : previous));
        return;
      }
      const body = (await response.json()) as { data?: CstTemplateRow };
      if (!body.data) throw new Error("EMPTY_RESPONSE");
      setRows((previous) =>
        previous
          ? previous.map((row) => (row.id === body.data!.id ? body.data! : row))
          : previous,
      );
      setEditing(null);
      setFeedback({ kind: "success", message: "Baris berhasil diperbarui." });
    } catch {
      setEditing((previous) =>
        previous
          ? {
              ...previous,
              error: "Gagal menyimpan perubahan. Periksa koneksi lalu coba lagi.",
            }
          : previous,
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveCreate(): Promise<void> {
    if (!creating || busy) return;
    const validation = validateCstDraft(creating.draft);
    if (validation) {
      setCreating({ ...creating, error: validation.message });
      return;
    }
    const payload = draftToCreatePayload(creating.draft, kategori.id);
    if (!payload) {
      setCreating({ ...creating, error: "Data belum valid." });
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/calculation-sheet-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const message = await readApiErrorMessage(response, "Gagal menyimpan baris.");
        setCreating((previous) => (previous ? { ...previous, error: message } : previous));
        return;
      }
      const body = (await response.json()) as { data?: CstTemplateRow };
      if (!body.data) throw new Error("EMPTY_RESPONSE");
      setRows((previous) => (previous ? [...previous, body.data!] : previous));
      setCreating(null);
      setFeedback({ kind: "success", message: "Baris berhasil ditambahkan." });
    } catch {
      setCreating((previous) =>
        previous
          ? {
              ...previous,
              error: "Gagal menyimpan baris. Periksa koneksi lalu coba lagi.",
            }
          : previous,
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteRow(row: CstTemplateRow): Promise<void> {
    if (!canManage || busy) return;
    const confirmed = window.confirm(`Hapus baris "${row.kode} — ${row.nama}"?`);
    if (!confirmed) return;

    setBusy(true);
    try {
      const response = await fetch(
        `/api/calculation-sheet-template/${encodeURIComponent(row.id)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        setFeedback({
          kind: "error",
          message: await readApiErrorMessage(response, "Gagal menghapus baris."),
        });
        return;
      }
      setRows((previous) =>
        previous ? previous.filter((item) => item.id !== row.id) : previous,
      );
      setFeedback({ kind: "success", message: "Baris berhasil dihapus." });
    } catch {
      setFeedback({
        kind: "error",
        message: "Gagal menghapus baris. Periksa koneksi lalu coba lagi.",
      });
    } finally {
      setBusy(false);
    }
  }

  const totalRows = rows?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline pb-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
              Core Enterprise
            </span>
            <span className="text-xs text-primary/50">•</span>
            <Link
              href="/dashboard/calculation-sheet-template/summary"
              className="text-xs font-semibold text-primary/50 transition-colors hover:text-secondary"
            >
              Calculation Sheet Template
            </Link>
            <span className="text-xs text-primary/50">•</span>
            <span className="text-xs text-primary/50">{kategori.label}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            {kategori.label}
          </h1>
          <p className="mt-1 max-w-3xl text-base text-primary/70">
            Master reference template calculation sheet kategori {kategori.label},
            dikelola langsung di dalam tabel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/calculation-sheet-template/summary"
            className="rounded-lg border border-outline bg-white px-3 py-1.5 text-[11px] font-bold text-primary/70 transition-colors hover:bg-background"
          >
            ← Summary Report
          </Link>
          {canManage ? (
            <span className="rounded-full bg-background px-3 py-1 text-[11px] font-semibold text-primary/60">
              {totalRows} baris
            </span>
          ) : (
            <span className="rounded-full bg-background px-3 py-1 text-[11px] font-semibold text-primary/60">
              Mode baca · {totalRows} baris
            </span>
          )}
        </div>
      </div>

      {feedback ? (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
            feedback.kind === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            className="rounded border border-red-300 bg-white px-3 py-1.5 font-bold text-red-700 transition-colors hover:bg-red-100"
          >
            Coba Lagi
          </button>
        </div>
      ) : null}

      {loading && rows === null ? (
        <div className="space-y-3 rounded-2xl border border-outline/60 bg-white p-6" aria-live="polite">
          <p className="text-xs font-medium text-primary/60">
            Memuat Calculation Sheet Template...
          </p>
          <div className="h-10 animate-pulse rounded-lg bg-background" />
          <div className="h-16 animate-pulse rounded-lg bg-background" />
          <div className="h-16 animate-pulse rounded-lg bg-background" />
        </div>
      ) : rows === null ? (
        <div className="rounded-2xl border border-outline/60 bg-white p-8 text-center">
          <p className="text-sm font-bold text-primary">
            Gagal memuat Calculation Sheet Template.
          </p>
          <p className="mt-1 text-xs text-primary/60">Periksa koneksi lalu coba kembali.</p>
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      ) : (
        <CstTable
          rows={rows}
          canManage={canManage}
          editing={editing}
          creating={creating}
          busy={busy}
          picOptions={picOptions}
          picLoading={picLoading}
          picError={picError}
          onStartEdit={startEdit}
          onCancelEdit={cancelEdit}
          onEditDraftChange={editDraftChange}
          onSaveEdit={() => void saveEdit()}
          onDelete={(row) => void deleteRow(row)}
          onStartCreate={startCreate}
          onCancelCreate={cancelCreate}
          onCreateDraftChange={createDraftChange}
          onSaveCreate={() => void saveCreate()}
        />
      )}
    </div>
  );
}
