"use client";

import { useEffect, useRef, useState } from "react";
import CertificateDeleteDialog from "@/components/dashboard/green-building-esg/CertificateDeleteDialog";
import CertificateFormDialog from "@/components/dashboard/green-building-esg/CertificateFormDialog";
import CertificateTable from "@/components/dashboard/green-building-esg/CertificateTable";
import {
  isGreenBuildingCertificate,
} from "@/components/dashboard/green-building-esg/api-error";
import type {
  GreenBuildingCertificate,
  GreenBuildingCertificateDialogState,
} from "@/components/dashboard/green-building-esg/types";

const SEARCH_DEBOUNCE_MS = 300;

function listEndpoint(query: string, year: string): string {
  const params = new URLSearchParams();
  if (query !== "") params.set("search", query);
  if (year !== "") params.set("year", year);
  const suffix = params.toString();
  return `/api/green-building-esg/certificates${suffix ? `?${suffix}` : ""}`;
}

function readAvailableYears(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is number => typeof item === "number" && Number.isInteger(item),
  );
}

export default function SertifikasiPage({ canManage }: { canManage: boolean }) {
  const [rows, setRows] = useState<GreenBuildingCertificate[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [dialog, setDialog] = useState<GreenBuildingCertificateDialogState | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] =
    useState<GreenBuildingCertificate | null>(null);
  const hasLoadedRef = useRef(false);
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
        const response = await fetch(listEndpoint(query, year), {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as {
          data?: unknown;
          meta?: { available_years?: unknown };
        };
        if (!Array.isArray(body.data)) throw new Error("INVALID_RESPONSE");
        if (!active || requestId !== requestIdRef.current) return;
        setRows(body.data.filter(isGreenBuildingCertificate));
        setAvailableYears(readAvailableYears(body.meta?.available_years));
        hasLoadedRef.current = true;
      } catch {
        if (
          !active ||
          controller.signal.aborted ||
          requestId !== requestIdRef.current
        ) {
          return;
        }
        setError("Gagal memuat data Sertifikasi Green Building.");
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
  }, [query, year, reloadToken]);

  const hasFilters = query !== "" || year !== "";
  const emptyMessage = hasFilters
    ? "Tidak ada sertifikat yang cocok dengan filter."
    : "Belum ada sertifikat Green Building.";

  function resetFilters(): void {
    setSearch("");
    setQuery("");
    setYear("");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
              Core Enterprise
            </span>
            <span className="text-xs text-primary/50">•</span>
            <span className="text-xs text-primary/50">
              Database Green Building &amp; ESG
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Sertifikasi Green Building
          </h1>
          <p className="mt-1 max-w-3xl text-base text-primary/70">
            Kelola sertifikasi green building berdasarkan Master Project.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={() => setDialog({ mode: "create" })}
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
            <span>Tambah Sertifikat</span>
          </button>
        ) : null}
      </div>

      {notice ? (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Tutup notifikasi"
            className="rounded p-1 text-emerald-700 hover:bg-emerald-100"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      ) : null}

      <section className="rounded-lg border border-outline bg-surface shadow-sm">
        <div className="flex flex-col gap-3 border-b border-outline p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="green-building-search"
                className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-primary/50"
              >
                Cari Nama Proyek
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
                  id="green-building-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama proyek..."
                  className="h-10 w-full rounded-lg border border-outline/60 bg-white pl-9 pr-3.5 text-xs font-semibold text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
            </div>
            <div className="w-full sm:w-40">
              <label
                htmlFor="green-building-year"
                className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-primary/50"
              >
                Tahun
              </label>
              <select
                id="green-building-year"
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className="h-10 w-full rounded-lg border border-outline/60 bg-white px-3 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                <option value="">Semua tahun</option>
                {availableYears.map((item) => (
                  <option key={item} value={item}>
                    {item}
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
            {!loading ? <span>{rows.length} sertifikat</span> : null}
            <span aria-live="polite" className="text-secondary">
              {refreshing ? "Memperbarui data..." : ""}
            </span>
          </div>
        </div>

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
          <CertificateTable
            rows={rows}
            initialLoading={loading && rows.length === 0}
            emptyMessage={emptyMessage}
            emptyActionLabel={hasFilters ? "Reset Filter" : undefined}
            onEmptyAction={hasFilters ? resetFilters : undefined}
            canManage={canManage}
            onEdit={(row) => setDialog({ mode: "edit", record: row })}
            onDelete={(row) => setDeleteTarget(row)}
          />
        )}
      </section>

      {dialog ? (
        <CertificateFormDialog
          mode={dialog.mode}
          record={dialog.mode === "edit" ? dialog.record : undefined}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {deleteTarget ? (
        <CertificateDeleteDialog
          record={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      ) : null}
    </div>
  );
}
