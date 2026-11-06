"use client";

import { useEffect, useRef, useState } from "react";
import MetodeKerjaDeleteDialog from "@/components/dashboard/metode-kerja-standar/MetodeKerjaDeleteDialog";
import MetodeKerjaFormDialog, {
  type MetodeKerjaFormTarget,
} from "@/components/dashboard/metode-kerja-standar/MetodeKerjaFormDialog";
import MetodeKerjaTable, {
  itemReorderIds,
  subKategoriReorderIds,
} from "@/components/dashboard/metode-kerja-standar/MetodeKerjaTable";
import type {
  MetodeKerjaDisiplinDetailDto,
  MetodeKerjaItemDto,
  MetodeKerjaSubKategoriDto,
} from "@/lib/metode-kerja-standar/service";

// One discipline page: fetch, three-level table, CRUD dialogs and reorder.
//
// State lives here (not in the table) so a mutation can refetch the whole
// discipline and let the server own ordering and audit fields. There is no
// optimistic update: after create/edit/delete/reorder the page reloads the
// detail and the table re-renders from that response.

const DISIPLIN_DESCRIPTIONS: Record<string, string> = {
  A: "Metode kerja untuk pekerjaan struktur: pondasi, beton, baja, dan pekerjaan struktural lain.",
  B: "Metode kerja arsitektur: dinding, finishing, atap, kusen, dan pekerjaan arsitektural.",
  C: "Metode kerja MEP: mekanikal, elektrikal, plumbing, dan sistem pendukung bangunan.",
  D: "Metode kerja landscape, hardscape, dan infrastruktur kawasan.",
  E: "Metode kerja site management: mobilisasi, K3, pengelolaan lahan, dan fasilitas proyek.",
  F: "Metode kerja lain yang tidak termasuk disiplin A–E. Disiplin ini selalu tersedia walau masih kosong.",
};

type DialogTarget =
  | { kind: "sub-kategori"; mode: "create" }
  | { kind: "sub-kategori"; mode: "edit"; record: MetodeKerjaSubKategoriDto }
  | { kind: "item"; mode: "create"; parent: MetodeKerjaSubKategoriDto }
  | {
      kind: "item";
      mode: "edit";
      parent: MetodeKerjaSubKategoriDto;
      record: MetodeKerjaItemDto;
    };

type DeleteTarget =
  | { kind: "sub-kategori"; record: MetodeKerjaSubKategoriDto }
  | { kind: "item"; record: MetodeKerjaItemDto };

type Feedback = { kind: "success"; message: string };

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
    return "Anda tidak memiliki akses untuk mengubah Metode Kerja Standar.";
  }
  if (response.status === 409) {
    return "Data berubah di tempat lain. Muat ulang lalu coba lagi.";
  }
  return fallback;
}

export default function MetodeKerjaDisiplinPage({
  disiplinCode,
  disiplinSlug,
  disiplinName,
  canManage,
  canDelete,
}: {
  disiplinCode: string;
  disiplinSlug: string;
  disiplinName: string;
  canManage: boolean;
  canDelete: boolean;
}) {
  const [detail, setDetail] = useState<MetodeKerjaDisiplinDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [dialog, setDialog] = useState<DialogTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [reorderBusyKey, setReorderBusyKey] = useState<string | null>(null);

  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let active = true;

    async function loadDetail(): Promise<void> {
      if (hasLoadedRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const response = await fetch(
          `/api/metode-kerja-standar/${encodeURIComponent(disiplinSlug)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const body = (await response.json()) as {
          data?: MetodeKerjaDisiplinDetailDto;
        };
        if (!body.data || !Array.isArray(body.data.sub_kategori)) {
          throw new Error("INVALID_RESPONSE");
        }
        if (!active || requestId !== requestIdRef.current) return;
        setDetail(body.data);
        hasLoadedRef.current = true;
      } catch {
        if (!active || controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        setError(
          "Gagal memuat data Metode Kerja Standar. Periksa koneksi lalu coba lagi.",
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

  function retryLoad(): void {
    setLoading(detail === null);
    setReloadToken((token) => token + 1);
  }

  function buildFormTarget(current: DialogTarget): MetodeKerjaFormTarget {
    const base = { disiplinCode, disiplinSlug, disiplinName };
    if (current.kind === "sub-kategori") {
      return current.mode === "create"
        ? { ...base, kind: "sub-kategori", mode: "create" }
        : { ...base, kind: "sub-kategori", mode: "edit", record: current.record };
    }
    return current.mode === "create"
      ? { ...base, kind: "item", mode: "create", parent: current.parent }
      : {
          ...base,
          kind: "item",
          mode: "edit",
          parent: current.parent,
          record: current.record,
        };
  }

  async function submitReorder(
    entity: "sub_kategori" | "item",
    parentId: string,
    orderedIds: string[],
    busyKey: string,
  ): Promise<void> {
    if (reorderBusyKey !== null) return;
    setReorderBusyKey(busyKey);
    setError(null);
    try {
      const response = await fetch("/api/metode-kerja-standar/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity,
          parent_id: parentId,
          ordered_ids: orderedIds,
        }),
      });
      if (!response.ok) {
        setError(
          await readApiErrorMessage(
            response,
            "Gagal menyimpan urutan baru. Muat ulang data lalu coba lagi.",
          ),
        );
        return;
      }
      setFeedback({ kind: "success", message: "Urutan berhasil disimpan." });
      setReloadToken((token) => token + 1);
    } catch {
      setError("Gagal menyimpan urutan. Periksa koneksi lalu coba lagi.");
    } finally {
      setReorderBusyKey(null);
    }
  }

  function handleReorderSubKategori(
    sub: MetodeKerjaSubKategoriDto,
    direction: "up" | "down",
  ): void {
    if (!canManage || !detail) return;
    const index = detail.sub_kategori.findIndex((row) => row.id === sub.id);
    const orderedIds = subKategoriReorderIds(detail.sub_kategori, index, direction);
    if (!orderedIds) return;
    void submitReorder("sub_kategori", disiplinCode, orderedIds, `sub-${sub.id}`);
  }

  function handleReorderItem(
    sub: MetodeKerjaSubKategoriDto,
    item: MetodeKerjaItemDto,
    direction: "up" | "down",
  ): void {
    if (!canManage) return;
    const index = sub.items.findIndex((row) => row.id === item.id);
    const orderedIds = itemReorderIds(sub.items, index, direction);
    if (!orderedIds) return;
    void submitReorder("item", sub.id, orderedIds, `item-${item.id}`);
  }

  const subKategori = detail?.sub_kategori ?? [];
  const itemCount = subKategori.reduce((total, sub) => total + sub.items.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline pb-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
              Core Enterprise
            </span>
            <span className="text-xs text-primary/50">•</span>
            <span className="text-xs text-primary/50">Metode Kerja Standar</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            {disiplinCode}. {disiplinName}
          </h1>
          <p className="mt-1 max-w-3xl text-base text-primary/70">
            {DISIPLIN_DESCRIPTIONS[disiplinCode] ?? "Metode kerja standar disiplin ini."}
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
          {subKategori.length} sub-kategori · {itemCount} item
        </p>
        {!loading ? (
          <span aria-live="polite" className="text-[11px] font-semibold text-secondary">
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
        <div className="space-y-3 rounded-2xl border border-outline/60 bg-white p-6" aria-live="polite">
          <p className="text-xs font-medium text-primary/60">
            Memuat Metode Kerja Standar disiplin {disiplinCode}...
          </p>
          <div className="h-10 animate-pulse rounded-lg bg-background" />
          <div className="h-16 animate-pulse rounded-lg bg-background" />
          <div className="h-16 animate-pulse rounded-lg bg-background" />
        </div>
      ) : detail === null ? (
        <div className="rounded-2xl border border-outline/60 bg-white p-8 text-center">
          <p className="text-sm font-bold text-primary">
            Gagal memuat data disiplin {disiplinCode}.
          </p>
          <p className="mt-1 text-xs text-primary/60">Periksa koneksi lalu coba kembali.</p>
          <button
            type="button"
            onClick={retryLoad}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      ) : (
        <MetodeKerjaTable
          disiplinCode={disiplinCode}
          disiplinName={disiplinName}
          subKategori={subKategori}
          canManage={canManage}
          canDelete={canDelete}
          reorderBusyKey={reorderBusyKey}
          onAddSubKategori={() => setDialog({ kind: "sub-kategori", mode: "create" })}
          onAddItem={(sub) => setDialog({ kind: "item", mode: "create", parent: sub })}
          onEditSubKategori={(sub) =>
            setDialog({ kind: "sub-kategori", mode: "edit", record: sub })
          }
          onEditItem={(sub, item) =>
            setDialog({ kind: "item", mode: "edit", parent: sub, record: item })
          }
          onDeleteSubKategori={(sub) =>
            setDeleteTarget({ kind: "sub-kategori", record: sub })
          }
          onDeleteItem={(sub, item) =>
            setDeleteTarget({ kind: "item", record: item })
          }
          onReorderSubKategori={handleReorderSubKategori}
          onReorderItem={handleReorderItem}
        />
      )}

      {dialog ? (
        <MetodeKerjaFormDialog
          key={
            dialog.mode === "create"
              ? `create-${dialog.kind}`
              : `edit-${dialog.record.id}`
          }
          target={buildFormTarget(dialog)}
          canDelete={canDelete}
          onClose={() => setDialog(null)}
          onSaved={(message) => {
            setDialog(null);
            setFeedback({ kind: "success", message });
            setReloadToken((token) => token + 1);
          }}
          onDeleted={(message) => {
            setDialog(null);
            setFeedback({ kind: "success", message });
            setReloadToken((token) => token + 1);
          }}
          onAddItem={
            dialog.kind === "sub-kategori" && dialog.mode === "edit"
              ? (parent) => setDialog({ kind: "item", mode: "create", parent })
              : undefined
          }
        />
      ) : null}

      {deleteTarget ? (
        <MetodeKerjaDeleteDialog
          kind={deleteTarget.kind}
          id={deleteTarget.record.id}
          kode={deleteTarget.record.kode}
          nama={deleteTarget.record.nama}
          itemCount={
            deleteTarget.kind === "sub-kategori"
              ? deleteTarget.record.items.length
              : undefined
          }
          onCancel={() => setDeleteTarget(null)}
          onDeleted={(message) => {
            setDeleteTarget(null);
            setFeedback({ kind: "success", message });
            setReloadToken((token) => token + 1);
          }}
        />
      ) : null}
    </div>
  );
}
