"use client";

import { useEffect, useRef, useState } from "react";
import RegulationDeleteDialog from "@/components/dashboard/regulation/RegulationDeleteDialog";
import RegulationDocumentDialog from "@/components/dashboard/regulation/RegulationDocumentDialog";
import RegulationSubKategoriDialog from "@/components/dashboard/regulation/RegulationSubKategoriDialog";
import RegulationTable from "@/components/dashboard/regulation/RegulationTable";
import {
  REGULATION_DISIPLIN_DESCRIPTIONS,
  readRegulationApiError,
} from "@/components/dashboard/regulation/regulation-ui";
import type { RegulationDisiplinKey } from "@/lib/regulation/constants";
import type {
  RegulationDisiplinDetailDto,
  RegulationDocumentDto,
  RegulationSubKategoriDto,
} from "@/lib/regulation/service";

// One Regulation discipline page: fetch the complete discipline, render the
// two-level table, and refetch after every successful mutation. There is no
// optimistic update, so ordering and audit fields always come from the server.

type DialogTarget =
  | { kind: "sub-kategori"; mode: "create" }
  | {
      kind: "sub-kategori";
      mode: "edit";
      record: RegulationSubKategoriDto;
    }
  | {
      kind: "document";
      mode: "create";
      parent: RegulationSubKategoriDto;
    }
  | {
      kind: "document";
      mode: "edit";
      parent: RegulationSubKategoriDto;
      record: RegulationDocumentDto;
    };

type DeleteTarget =
  | { kind: "sub-kategori"; record: RegulationSubKategoriDto }
  | { kind: "document"; record: RegulationDocumentDto };

type Feedback = { message: string };

export default function RegulationDisiplinPage({
  disiplinKey,
  disiplinSlug,
  disiplinName,
  canManage,
}: {
  disiplinKey: RegulationDisiplinKey;
  disiplinSlug: string;
  disiplinName: string;
  canManage: boolean;
}) {
  const [detail, setDetail] = useState<RegulationDisiplinDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [dialog, setDialog] = useState<DialogTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const loadedSlugRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let active = true;

    async function loadDetail(): Promise<void> {
      const sameSlug = loadedSlugRef.current === disiplinSlug;
      if (sameSlug) {
        setRefreshing(true);
      } else {
        setDetail(null);
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetch(
          `/api/regulation/${encodeURIComponent(disiplinSlug)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) {
          const message = await readRegulationApiError(
            response,
            "Gagal memuat data Standard & Regulation.",
          );
          if (!active || requestId !== requestIdRef.current) return;
          setError(message);
          return;
        }
        const body = (await response.json()) as {
          data?: RegulationDisiplinDetailDto;
        };
        if (!body.data || !Array.isArray(body.data.sub_kategori)) {
          throw new Error("INVALID_RESPONSE");
        }
        if (!active || requestId !== requestIdRef.current) return;
        setDetail(body.data);
        loadedSlugRef.current = disiplinSlug;
      } catch {
        if (
          !active ||
          controller.signal.aborted ||
          requestId !== requestIdRef.current
        ) {
          return;
        }
        setError(
          "Gagal memuat data Standard & Regulation. Periksa koneksi lalu coba lagi.",
        );
      } finally {
        if (active && requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadDetail();

    return () => {
      active = false;
      controller.abort();
    };
  }, [disiplinSlug, reloadToken]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function reload(): void {
    setReloadToken((token) => token + 1);
  }

  function retryLoad(): void {
    if (detail === null) setLoading(true);
    reload();
  }

  function mutationComplete(message: string): void {
    setDialog(null);
    setDeleteTarget(null);
    setFeedback({ message });
    setError(null);
    reload();
  }

  const subKategori = detail?.sub_kategori ?? [];
  const documentCount = subKategori.reduce(
    (total, sub) => total + sub.documents.length,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline pb-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
              Core Enterprise
            </span>
            <span className="text-xs text-primary/50">•</span>
            <span className="text-xs text-primary/50">
              Standard &amp; Regulation
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            {disiplinName}
          </h1>
          <p className="mt-1 max-w-3xl text-base text-primary/70">
            {REGULATION_DISIPLIN_DESCRIPTIONS[disiplinKey]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage ? (
            <button
              type="button"
              onClick={() => setDialog({ kind: "sub-kategori", mode: "create" })}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all duration-150 hover:bg-secondary"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              <span>Tambah Sub-Kategori</span>
            </button>
          ) : (
            <span className="rounded-full bg-background px-3 py-1 text-[11px] font-semibold text-primary/60">
              Mode baca
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-primary/50">
          {subKategori.length} sub-kategori · {documentCount} dokumen
        </p>
        {!loading ? (
          <span
            aria-live="polite"
            className="text-[11px] font-semibold text-secondary"
          >
            {refreshing ? "Memperbarui data..." : ""}
          </span>
        ) : null}
      </div>

      {feedback ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-semibold text-green-800"
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
            onClick={retryLoad}
            className="rounded border border-red-300 bg-white px-3 py-1.5 font-bold text-red-700 transition-colors hover:bg-red-100"
          >
            Coba Lagi
          </button>
        </div>
      ) : null}

      {loading && detail === null ? (
        <div
          className="space-y-3 rounded-2xl border border-outline/60 bg-white p-6"
          aria-live="polite"
        >
          <p className="text-xs font-medium text-primary/60">
            Memuat {disiplinName}...
          </p>
          <div className="h-8 animate-pulse rounded-lg bg-background" />
          <div className="h-14 animate-pulse rounded-lg bg-background" />
          <div className="h-14 animate-pulse rounded-lg bg-background" />
          <div className="h-14 animate-pulse rounded-lg bg-background" />
          <div className="h-14 animate-pulse rounded-lg bg-background" />
        </div>
      ) : detail === null ? (
        <div className="rounded-2xl border border-outline/60 bg-white p-8 text-center">
          <p className="text-sm font-bold text-primary">
            Gagal memuat data {disiplinName}.
          </p>
          <p className="mt-1 text-xs text-primary/60">
            Periksa koneksi lalu coba kembali.
          </p>
          <button
            type="button"
            onClick={retryLoad}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      ) : (
        <RegulationTable
          subKategori={subKategori}
          canManage={canManage}
          onAddSubKategori={() =>
            setDialog({ kind: "sub-kategori", mode: "create" })
          }
          onAddDocument={(parent) =>
            setDialog({ kind: "document", mode: "create", parent })
          }
          onEditSubKategori={(record) =>
            setDialog({ kind: "sub-kategori", mode: "edit", record })
          }
          onEditDocument={(parent, record) =>
            setDialog({ kind: "document", mode: "edit", parent, record })
          }
          onDeleteSubKategori={(record) =>
            setDeleteTarget({ kind: "sub-kategori", record })
          }
          onDeleteDocument={(_parent, record) =>
            setDeleteTarget({ kind: "document", record })
          }
        />
      )}

      {dialog?.kind === "sub-kategori" ? (
        <RegulationSubKategoriDialog
          key={
            dialog.mode === "edit"
              ? `sub-edit-${dialog.record.id}`
              : "sub-create"
          }
          disiplinSlug={disiplinSlug}
          disiplinName={disiplinName}
          record={dialog.mode === "edit" ? dialog.record : undefined}
          onClose={() => setDialog(null)}
          onSaved={mutationComplete}
        />
      ) : null}

      {dialog?.kind === "document" ? (
        <RegulationDocumentDialog
          key={
            dialog.mode === "edit"
              ? `doc-edit-${dialog.record.id}`
              : `doc-create-${dialog.parent.id}`
          }
          parent={dialog.parent}
          record={dialog.mode === "edit" ? dialog.record : undefined}
          disiplinName={disiplinName}
          onClose={() => setDialog(null)}
          onSaved={mutationComplete}
        />
      ) : null}

      {deleteTarget ? (
        <RegulationDeleteDialog
          kind={deleteTarget.kind}
          id={deleteTarget.record.id}
          kode={deleteTarget.record.kode}
          nama={deleteTarget.record.nama}
          documentCount={
            deleteTarget.kind === "sub-kategori"
              ? deleteTarget.record.documents.length
              : undefined
          }
          onCancel={() => setDeleteTarget(null)}
          onDeleted={mutationComplete}
        />
      ) : null}
    </div>
  );
}
