"use client";

import { useEffect, useRef, useState } from "react";
import LearningCard from "@/components/dashboard/learning/LearningCard";
import {
  isLearningCategory,
  isLearningContentListItem,
  type LearningCategory,
  type LearningContentListItem,
  type LearningContentType,
} from "@/components/dashboard/learning/types";

const SEARCH_DEBOUNCE_MS = 300;
const SKELETON_KEYS = [
  "s1",
  "s2",
  "s3",
  "s4",
  "s5",
  "s6",
  "s7",
  "s8",
];

function listEndpoint(
  type: LearningContentType,
  query: string,
  category: string,
  page: number,
): string {
  const params = new URLSearchParams({ type, page: String(page) });
  if (query !== "") params.set("q", query);
  if (category !== "") params.set("category", category);
  return `/api/learning/contents?${params.toString()}`;
}

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-outline bg-surface shadow-sm">
      <div className="aspect-video w-full animate-pulse bg-slate-100" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

export default function LearningCardGrid({
  type,
  title,
  description,
  emptyMessage,
}: {
  type: LearningContentType;
  title: string;
  description: string;
  emptyMessage: string;
}) {
  const [rows, setRows] = useState<LearningContentListItem[]>([]);
  const [categories, setCategories] = useState<LearningCategory[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(24);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
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
        const response = await fetch(listEndpoint(type, query, category, page), {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as {
          data?: unknown;
          meta?: {
            total?: unknown;
            page_size?: unknown;
            available_categories?: unknown;
          };
        };
        if (!Array.isArray(body.data)) throw new Error("INVALID_RESPONSE");
        if (!active || requestId !== requestIdRef.current) return;

        setRows(body.data.filter(isLearningContentListItem));
        setTotal(typeof body.meta?.total === "number" ? body.meta.total : 0);
        setPageSize(
          typeof body.meta?.page_size === "number" && body.meta.page_size > 0
            ? body.meta.page_size
            : 24,
        );
        if (Array.isArray(body.meta?.available_categories)) {
          setCategories(body.meta.available_categories.filter(isLearningCategory));
        }
        hasLoadedRef.current = true;
      } catch {
        if (
          !active ||
          controller.signal.aborted ||
          requestId !== requestIdRef.current
        ) {
          return;
        }
        setError("Gagal memuat Building Learning Center.");
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
  }, [type, query, category, page, reloadToken]);

  const hasFilters = query !== "" || category !== "";
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  function resetFilters(): void {
    setSearch("");
    setQuery("");
    setCategory("");
    setPage(1);
  }

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
          {title}
        </h1>
        <p className="mt-1 max-w-3xl text-base text-primary/70">{description}</p>
      </div>

      <section className="rounded-lg border border-outline bg-surface shadow-sm">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor={`learning-search-${type}`}
                className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-primary/50"
              >
                Cari Judul
              </label>
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
                  id={`learning-search-${type}`}
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari judul konten..."
                  className="h-10 w-full rounded-lg border border-outline/60 bg-white pl-9 pr-3.5 text-xs font-semibold text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
            </div>

            <div className="w-full sm:w-56">
              <label
                htmlFor={`learning-category-${type}`}
                className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-primary/50"
              >
                Kategori
              </label>
              <select
                id={`learning-category-${type}`}
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(1);
                }}
                className="h-10 w-full rounded-lg border border-outline/60 bg-white px-3 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                <option value="">Semua kategori</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nama}
                  </option>
                ))}
              </select>
            </div>

            {hasFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="h-10 shrink-0 rounded-lg border border-outline bg-white px-4 text-xs font-bold text-primary transition-colors hover:bg-background"
              >
                Reset
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-primary/60">
            {!loading ? <span>{total} konten</span> : null}
            <span aria-live="polite" className="text-secondary">
              {refreshing ? "Memperbarui data..." : ""}
            </span>
          </div>
        </div>
      </section>

      {error && rows.length > 0 ? (
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

      {loading && rows.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {SKELETON_KEYS.map((key) => (
            <CardSkeleton key={key} />
          ))}
        </div>
      ) : error && rows.length === 0 ? (
        <div
          role="alert"
          className="rounded-lg border border-outline bg-surface p-8 text-center"
        >
          <p className="text-sm font-bold text-primary">{error}</p>
          <p className="mt-1 text-xs text-primary/60">
            Periksa koneksi lalu coba kembali.
          </p>
          <button
            type="button"
            onClick={() => setReloadToken((value) => value + 1)}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-outline bg-surface p-10 text-center">
          <p className="text-sm font-semibold text-primary/70">
            {hasFilters
              ? "Tidak ada konten yang cocok dengan filter."
              : emptyMessage}
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 rounded-lg border border-outline bg-white px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-background"
            >
              Reset Filter
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {rows.map((item) => (
              <LearningCard key={item.id} item={item} />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-primary/60">
              <span>
                {firstItem}–{lastItem} dari {total}
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
                <span className="tabular-nums">
                  {page} / {totalPages}
                </span>
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
        </>
      )}
    </div>
  );
}
