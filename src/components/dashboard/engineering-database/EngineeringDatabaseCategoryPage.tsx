"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  engineeringDatabaseCategoryToSlug,
  type EngineeringDatabaseCategory,
} from "@/lib/engineering-database/access";
import EngineeringDatabaseTable, {
  type EngineeringDatabaseTableRow,
} from "@/components/dashboard/engineering-database/EngineeringDatabaseTable";

// Category list page for one Engineering Database category. Search is
// server-side and category-scoped (the route slug never becomes a category
// value — the canonical category constant does).

const SEARCH_DEBOUNCE_MS = 300;

function listEndpoint(
  category: EngineeringDatabaseCategory,
  query: string,
): string {
  const params = new URLSearchParams({ category });
  if (query !== "") {
    params.set("q", query);
  }
  return `/api/engineering-database?${params.toString()}`;
}

export default function EngineeringDatabaseCategoryPage({
  category,
  categoryLabel,
  canManage,
}: {
  category: EngineeringDatabaseCategory;
  categoryLabel: string;
  canManage: boolean;
}) {
  const [rows, setRows] = useState<EngineeringDatabaseTableRow[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  // Guard against a slow earlier request overwriting a newer result.
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let active = true;

    async function loadRows(): Promise<void> {
      if (hasLoadedRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const response = await fetch(listEndpoint(category, query), {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const body = (await response.json()) as { data?: unknown };
        if (!Array.isArray(body.data)) {
          throw new Error("INVALID_RESPONSE");
        }
        if (!active || requestId !== requestIdRef.current) {
          return;
        }
        setRows(body.data as EngineeringDatabaseTableRow[]);
        hasLoadedRef.current = true;
      } catch {
        if (!active || controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        setError("Gagal memuat data Engineering Database.");
      } finally {
        if (active && requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadRows();

    return () => {
      active = false;
      controller.abort();
    };
  }, [category, query, reloadToken]);

  const categorySlug = engineeringDatabaseCategoryToSlug(category);

  async function handleDelete(row: EngineeringDatabaseTableRow): Promise<void> {
    if (!canManage || deletingId !== null) {
      return;
    }
    const confirmed = window.confirm(
      `Hapus data "${row.project.name}" pada kategori ${categoryLabel}? Tindakan ini tidak dapat dibatalkan.`,
    );
    if (!confirmed) {
      return;
    }
    setDeleteError(null);
    setDeletingId(row.id);
    try {
      const response = await fetch(`/api/engineering-database/${row.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("DELETE_FAILED");
      }
      setReloadToken((value) => value + 1);
    } catch {
      setDeleteError("Gagal menghapus data Engineering Database.");
    } finally {
      setDeletingId(null);
    }
  }

  // Management keeps the same page; only the verb in the subtitle changes.
  const subtitle = canManage
    ? `Kelola data ${categoryLabel} berdasarkan Master Project.`
    : `Lihat data ${categoryLabel} berdasarkan Master Project.`;
  const emptyMessage =
    query === ""
      ? `Belum ada data ${categoryLabel}.`
      : "Tidak ada proyek yang cocok dengan pencarian.";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
              Core Enterprise
            </span>
            <span className="text-xs text-primary/50">•</span>
            <span className="text-xs text-primary/50">Engineering Databases</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">{categoryLabel}</h1>
          <p className="mt-1 max-w-3xl text-base text-primary/70">{subtitle}</p>
        </div>
        {canManage ? (
          <Link
            href={`/dashboard/engineering-database/${categorySlug}/new`}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all duration-150 hover:bg-secondary"
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
            <span>Tambah {categoryLabel}</span>
          </Link>
        ) : null}
      </div>

      <section className="rounded-lg border border-outline bg-surface shadow-sm">
        <div className="border-b border-outline p-4">
          <div className="relative">
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
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama atau lokasi proyek..."
              aria-label={`Cari data ${categoryLabel}`}
              className="h-10 w-full rounded-lg border border-outline/60 bg-white pl-9 pr-3.5 text-xs font-semibold text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
        </div>

        {deleteError ? (
          <div
            role="alert"
            className="border-b border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
          >
            {deleteError}
          </div>
        ) : null}

        {error && rows.length > 0 ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
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

        {error && rows.length === 0 ? (
          <div role="alert" className="p-8 text-center">
            <p className="text-sm font-bold text-primary">{error}</p>
            <p className="mt-1 text-xs text-primary/60">Periksa koneksi lalu coba kembali.</p>
            <button
              type="button"
              onClick={() => setReloadToken((value) => value + 1)}
              className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
            >
              Coba Lagi
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1 border-b border-outline px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-primary">Daftar {categoryLabel}</h2>
                <p className="mt-0.5 text-xs text-primary/50">
                  Proyek, file, PIC, dan catatan untuk kategori ini.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-primary/60">
                {!loading ? <span>{rows.length} entri</span> : null}
                <span aria-live="polite" className="text-secondary">
                  {refreshing ? "Memperbarui data..." : ""}
                </span>
              </div>
            </div>

            <EngineeringDatabaseTable
              rows={rows}
              initialLoading={loading && rows.length === 0}
              emptyMessage={emptyMessage}
              categorySlug={categorySlug}
              canManage={canManage}
              deletingId={deletingId}
              onDelete={(row) => void handleDelete(row)}
            />
          </>
        )}
      </section>
    </div>
  );
}
