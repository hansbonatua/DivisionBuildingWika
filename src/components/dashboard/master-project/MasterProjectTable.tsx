"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  canCreateMasterProject,
  canDeleteMasterProject,
  canEditMasterProject,
} from "@/lib/master-project/access";

type MasterProjectApiItem = {
  id: string;
  name: string;
  location: string;
  pic?: { id?: string; name?: string } | null;
};

const EMPTY_VALUE = "\u2014";
const SEARCH_DEBOUNCE_MS = 300;

const headerCell =
  "whitespace-nowrap border-b border-outline bg-background px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";

const bodyCell =
  "border-b border-outline/50 px-4 py-3 align-top text-xs text-primary/80";

const skeletonRows = ["first", "second", "third", "fourth"];

function displayText(value: string | null | undefined): string {
  return typeof value === "string" && value.trim() !== "" ? value : EMPTY_VALUE;
}

function TableSkeleton() {
  return (
    <>
      {skeletonRows.map((row) => (
        <tr key={row} className="border-b border-outline/40">
          <td className="px-4 py-4">
            <div className="h-3 w-8 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-56 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="ml-auto h-3 w-24 animate-pulse rounded bg-slate-100" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function MasterProjectTable({
  currentUserRole,
}: {
  currentUserRole: string;
}) {
  const [rows, setRows] = useState<MasterProjectApiItem[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);

  const canAdd = canCreateMasterProject(currentUserRole);
  const canEdit = canEditMasterProject(currentUserRole);
  const canDelete = canDeleteMasterProject(currentUserRole);

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
        const endpoint =
          query === ""
            ? "/api/master-project"
            : `/api/master-project?q=${encodeURIComponent(query)}`;
        const response = await fetch(endpoint, {
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
        setRows(body.data as MasterProjectApiItem[]);
        hasLoadedRef.current = true;
      } catch {
        if (!active || controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        setError("Gagal memuat Master Project.");
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
  }, [query, reloadToken]);

  async function handleDelete(item: MasterProjectApiItem): Promise<void> {
    if (deletingId !== null || !canDelete) {
      return;
    }
    const confirmed = window.confirm(
      `Hapus "${item.name}"? Tindakan ini tidak dapat dibatalkan.`,
    );
    if (!confirmed) {
      return;
    }

    setDeleteError(null);
    setDeletingId(item.id);
    try {
      const response = await fetch(`/api/master-project/${item.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("DELETE_FAILED");
      }
      setReloadToken((value) => value + 1);
    } catch {
      setDeleteError("Gagal menghapus Master Project.");
    } finally {
      setDeletingId(null);
    }
  }

  const showInitialSkeleton = loading && rows.length === 0;
  const emptyMessage =
    query === ""
      ? "Belum ada Master Project."
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
            <span className="text-xs text-primary/50">Master Project</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Kelola Project
          </h1>
          <p className="max-w-3xl text-base text-primary/70">
            Kelola daftar Master Project Building Division.
          </p>
        </div>
        {canAdd ? (
          <Link
            href="/dashboard/master-project/manage/new"
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
            <span>Tambah Project</span>
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
              aria-label="Cari Master Project"
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
        ) : (
          <>
            <div className="flex flex-col gap-1 border-b border-outline px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-primary">
                  Daftar Master Project
                </h2>
                <p className="mt-0.5 text-xs text-primary/50">
                  Nama, lokasi, dan PIC untuk setiap project.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-primary/60">
                {!loading ? <span>{rows.length} proyek</span> : null}
                <span aria-live="polite" className="text-secondary">
                  {refreshing ? "Memperbarui data..." : ""}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-xs">
                <thead>
                  <tr>
                    <th scope="col" className={`${headerCell} w-16`}>
                      No
                    </th>
                    <th scope="col" className={headerCell}>
                      Nama Proyek
                    </th>
                    <th scope="col" className={headerCell}>
                      Lokasi Proyek
                    </th>
                    <th scope="col" className={headerCell}>
                      PIC
                    </th>
                    <th scope="col" className={`${headerCell} text-right`}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {showInitialSkeleton ? (
                    <TableSkeleton />
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-xs font-medium text-primary/60"
                      >
                        <p className="text-sm font-medium text-primary/70">
                          {emptyMessage}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    rows.map((item, index) => {
                      const hasActions = canEdit || canDelete;
                      return (
                        <tr
                          key={item.id}
                          className="transition-colors hover:bg-background/60"
                        >
                          <td className={`${bodyCell} tabular-nums text-primary/50`}>
                            {index + 1}
                          </td>
                          <td
                            className={`${bodyCell} min-w-56 font-semibold text-primary`}
                          >
                            {displayText(item.name)}
                          </td>
                          <td className={`${bodyCell} min-w-44`}>
                            {displayText(item.location)}
                          </td>
                          <td className={`${bodyCell} min-w-40`}>
                            {displayText(item.pic?.name)}
                          </td>
                          <td
                            className={`${bodyCell} whitespace-nowrap text-right`}
                          >
                            {hasActions ? (
                              <>
                                {canEdit ? (
                                  <Link
                                    href={`/dashboard/master-project/manage/${item.id}/edit`}
                                    className="rounded px-2.5 py-1 text-xs font-bold text-secondary hover:bg-blue-50"
                                  >
                                    Edit
                                  </Link>
                                ) : null}
                                {canDelete ? (
                                  <button
                                    type="button"
                                    disabled={deletingId !== null}
                                    onClick={() => void handleDelete(item)}
                                    title={`Hapus ${item.name}`}
                                    className="rounded px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {deletingId === item.id
                                      ? "Menghapus..."
                                      : "Hapus"}
                                  </button>
                                ) : null}
                              </>
                            ) : (
                              <span className="text-primary/40">
                                {EMPTY_VALUE}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
