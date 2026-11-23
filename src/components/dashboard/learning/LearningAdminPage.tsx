"use client";

import { useEffect, useState } from "react";
import LearningDeleteDialog from "@/components/dashboard/learning/LearningDeleteDialog";
import LearningFormDialog from "@/components/dashboard/learning/LearningFormDialog";
import { readLearningApiError } from "@/components/dashboard/learning/api-error";
import {
  isLearningCategory,
  isLearningContentDetail,
  isLearningContentListItem,
  LEARNING_TYPE_LABELS,
  type LearningCategory,
  type LearningContentDialogState,
  type LearningContentListItem,
  type LearningContentType,
} from "@/components/dashboard/learning/types";

type AdminTab = LearningContentType | "categories";

const TABS: { key: AdminTab; label: string }[] = [
  { key: "sharing", label: "Sharing" },
  { key: "training", label: "Training" },
  { key: "certificate", label: "Certificate" },
  { key: "categories", label: "Kategori" },
];

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function LearningAdminPage() {
  const [tab, setTab] = useState<AdminTab>("sharing");
  const [rows, setRows] = useState<LearningContentListItem[]>([]);
  const [categories, setCategories] = useState<LearningCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [dialog, setDialog] = useState<LearningContentDialogState | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<LearningContentListItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const categoriesResponse = await fetch("/api/learning/categories", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!categoriesResponse.ok) throw new Error("CATEGORIES_FAILED");
        const categoriesBody = (await categoriesResponse.json()) as {
          data?: unknown;
        };
        if (!active) return;
        setCategories(
          Array.isArray(categoriesBody.data)
            ? categoriesBody.data.filter(isLearningCategory)
            : [],
        );

        if (tab === "categories") {
          setRows([]);
          setTotal(0);
          return;
        }

        const response = await fetch(
          `/api/learning/contents?type=${tab}&page=${page}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) throw new Error("CONTENTS_FAILED");
        const body = (await response.json()) as {
          data?: unknown;
          meta?: { total?: unknown };
        };
        if (!active) return;
        setRows(
          Array.isArray(body.data)
            ? body.data.filter(isLearningContentListItem)
            : [],
        );
        setTotal(typeof body.meta?.total === "number" ? body.meta.total : 0);
      } catch {
        if (active && !controller.signal.aborted) {
          setError("Gagal memuat data Building Learning Center.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [tab, page, reloadToken]);

  function changeTab(next: AdminTab): void {
    setTab(next);
    setPage(1);
    setNotice(null);
    setError(null);
  }

  async function openEdit(row: LearningContentListItem): Promise<void> {
    if (busyId) return;
    setBusyId(row.id);
    setError(null);
    try {
      const response = await fetch(`/api/learning/contents/${row.id}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(
          await readLearningApiError(response, "Gagal memuat detail konten."),
        );
      }
      const body = (await response.json()) as { data?: unknown };
      if (!isLearningContentDetail(body.data)) {
        throw new Error("Respons server tidak valid.");
      }
      setDialog({ mode: "edit", type: body.data.type, record: body.data });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Gagal memuat detail konten.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function handleSaved(message: string): void {
    setDialog(null);
    setNotice(message);
    setReloadToken((value) => value + 1);
  }

  function handleDeleted(message: string): void {
    setDeleteTarget(null);
    setNotice(message);
    setReloadToken((value) => value + 1);
  }

  const totalPages = Math.max(1, Math.ceil(total / 24));
  const showContentTable = tab !== "categories";

  return (
    <div className="space-y-6">
      <div className="border-b border-outline pb-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
            Core Enterprise
          </span>
          <span className="text-xs text-primary/50">•</span>
          <span className="text-xs text-primary/50">
            Building Learning Center
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Admin Control
        </h1>
        <p className="mt-1 max-w-3xl text-base text-primary/70">
          Kelola konten Sharing Session, Training, dan Certificate beserta
          kategorinya.
        </p>
      </div>

      {notice ? (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="shrink-0 font-bold text-emerald-700 hover:underline"
          >
            Tutup
          </button>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setReloadToken((value) => value + 1)}
            className="rounded border border-red-300 bg-white px-3 py-1.5 font-bold text-red-700 transition-colors hover:bg-red-100"
          >
            Coba Lagi
          </button>
        </div>
      ) : null}

      <section className="rounded-lg border border-outline bg-surface shadow-sm">
        <div className="flex flex-col gap-3 border-b border-outline p-4 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="tablist"
            aria-label="Jenis konten Building Learning Center"
            className="flex flex-wrap gap-1.5"
          >
            {TABS.map((item) => {
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => changeTab(item.key)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
                    active
                      ? "bg-primary text-white"
                      : "border border-outline bg-white text-primary hover:bg-background"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {showContentTable ? (
            <button
              type="button"
              onClick={() =>
                setDialog({ mode: "create", type: tab as LearningContentType })
              }
              className="rounded-lg bg-secondary px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary"
            >
              + Tambah Konten
            </button>
          ) : null}
        </div>

        {showContentTable ? (
          loading ? (
            <div className="space-y-2 p-4">
              {["r1", "r2", "r3", "r4"].map((key) => (
                <div
                  key={key}
                  className="h-11 w-full animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-primary/70">
                Belum ada konten {LEARNING_TYPE_LABELS[tab]}.
              </p>
              <button
                type="button"
                onClick={() =>
                  setDialog({ mode: "create", type: tab as LearningContentType })
                }
                className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-secondary"
              >
                Tambah Konten Pertama
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-background/60 text-[11px] uppercase tracking-wide text-primary/50">
                  <tr>
                    <th className="px-4 py-3 font-bold">Judul</th>
                    <th className="px-4 py-3 font-bold">Kategori</th>
                    <th className="px-4 py-3 font-bold">
                      {tab === "sharing" ? "Lampiran" : "Link Eksternal"}
                    </th>
                    <th className="px-4 py-3 font-bold">Diperbarui</th>
                    <th className="px-4 py-3 text-right font-bold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/60">
                  {rows.map((item) => (
                    <tr key={item.id} className="hover:bg-background/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-16 shrink-0 overflow-hidden rounded border border-outline bg-slate-100">
                            {item.thumbnail_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.thumbnail_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-primary">
                              {item.judul}
                            </p>
                            <p className="max-w-[260px] truncate text-[11px] text-primary/50">
                              {item.deskripsi && item.deskripsi.trim() !== ""
                                ? item.deskripsi
                                : "Tanpa deskripsi"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-secondary">
                          {item.kategori.nama}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-primary/60">
                        {tab === "sharing" ? (
                          `${item.attachment_count} file`
                        ) : (
                          <a
                            href={item.external_url ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-secondary hover:underline"
                          >
                            Buka link ↗
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-primary/60">
                        {formatDate(item.updated_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void openEdit(item)}
                            disabled={busyId !== null}
                            className="rounded border border-outline bg-white px-3 py-1.5 font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {busyId === item.id ? "Memuat..." : "Edit"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            disabled={busyId !== null}
                            className="rounded border border-red-200 bg-red-50 px-3 py-1.5 font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="bg-background/60 text-[11px] uppercase tracking-wide text-primary/50">
                <tr>
                  <th className="px-4 py-3 font-bold">Nama Kategori</th>
                  <th className="px-4 py-3 font-bold">Jumlah Konten</th>
                  <th className="px-4 py-3 font-bold">Urutan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/60">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-primary/50">
                      Memuat kategori...
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-primary/50">
                      Belum ada kategori. Kategori dibuat dari form konten
                      melalui tombol &ldquo;+ Kategori baru&rdquo;.
                    </td>
                  </tr>
                ) : (
                  categories.map((item) => (
                    <tr key={item.id} className="hover:bg-background/40">
                      <td className="px-4 py-3 font-bold text-primary">
                        {item.nama}
                      </td>
                      <td className="px-4 py-3 text-primary/60">
                        {item.content_count}
                      </td>
                      <td className="px-4 py-3 text-primary/60">
                        {item.sort_order}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <p className="border-t border-outline/60 px-4 py-3 text-[11px] text-primary/45">
              Kategori bersifat master data: hanya bisa ditambah dari form
              konten dan belum dapat diubah atau dihapus dari sini.
            </p>
          </div>
        )}

        {showContentTable && totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline px-4 py-3 text-xs font-semibold text-primary/60">
            <span>
              Halaman {page} dari {totalPages} · {total} konten
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-outline bg-white px-3 py-1.5 font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
                disabled={page >= totalPages}
                className="rounded-lg border border-outline bg-white px-3 py-1.5 font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {dialog ? (
        <LearningFormDialog
          mode={dialog.mode}
          type={dialog.type}
          record={dialog.mode === "edit" ? dialog.record : undefined}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {deleteTarget ? (
        <LearningDeleteDialog
          record={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      ) : null}
    </div>
  );
}
