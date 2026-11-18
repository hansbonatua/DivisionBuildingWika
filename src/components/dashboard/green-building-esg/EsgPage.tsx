"use client";

import { useEffect, useRef, useState } from "react";
import EsgDeleteDialog from "@/components/dashboard/green-building-esg/EsgDeleteDialog";
import EsgFormDialog from "@/components/dashboard/green-building-esg/EsgFormDialog";
import EsgTable from "@/components/dashboard/green-building-esg/EsgTable";
import {
  isEsgAssessment,
  readEsgApiError,
} from "@/components/dashboard/green-building-esg/api-error";
import type {
  EsgAssessment,
  EsgAssessmentDialogState,
  EsgMonthStatus,
} from "@/components/dashboard/green-building-esg/types";
import { esgMonthLabel } from "@/lib/esg-assessment/constants";

const SEARCH_DEBOUNCE_MS = 300;

// One in-flight month write per row: the DTO carries updated_at and the month
// list, so two concurrent writes on the same row could overwrite each other.
type CellError = {
  rowId: string;
  month: number;
  status: EsgMonthStatus | null;
  message: string;
};

function listEndpoint(query: string, year: string): string {
  const params = new URLSearchParams();
  if (query !== "") params.set("search", query);
  if (year !== "") params.set("year", year);
  const suffix = params.toString();
  return `/api/green-building-esg/esg-assessments${suffix ? `?${suffix}` : ""}`;
}

function readAvailableYears(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is number => typeof item === "number" && Number.isInteger(item),
  );
}

// Counter reconciliation for the optimistic update. The server returns the same
// derivation, so a successful PATCH simply replaces the row with its DTO.
function applyMonth(
  record: EsgAssessment,
  month: number,
  status: EsgMonthStatus | null,
): EsgAssessment {
  const months = record.months.map((cell) =>
    cell.month === month ? { ...cell, status } : cell,
  );
  return {
    ...record,
    months,
    completed_months: months.filter((cell) => cell.status === "Complete").length,
    half_months: months.filter((cell) => cell.status === "Half").length,
  };
}

export default function EsgPage({ canManage }: { canManage: boolean }) {
  const [rows, setRows] = useState<EsgAssessment[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [savingCells, setSavingCells] = useState<Set<string>>(
    () => new Set<string>(),
  );
  const [cellError, setCellError] = useState<CellError | null>(null);
  const [dialog, setDialog] = useState<EsgAssessmentDialogState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EsgAssessment | null>(null);
  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);
  const rowSequenceRef = useRef<Map<string, number>>(new Map());

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
        setRows(body.data.filter(isEsgAssessment));
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
        setError("Gagal memuat data Penilaian ESG.");
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
    ? "Tidak ada penilaian yang cocok dengan filter."
    : "Belum ada penilaian ESG.";

  function resetFilters(): void {
    setSearch("");
    setQuery("");
    setYear("");
  }

  function handleSaved(message: string): void {
    setDialog(null);
    setNotice(message);
    setCellError(null);
    setReloadToken((value) => value + 1);
  }

  function handleDeleted(message: string): void {
    setDeleteTarget(null);
    setNotice(message);
    setCellError(null);
    setReloadToken((value) => value + 1);
  }

  async function handleMonthChange(
    row: EsgAssessment,
    month: number,
    status: EsgMonthStatus | null,
  ): Promise<void> {
    const key = `${row.id}:${month}`;
    const label = esgMonthLabel(month);
    if (savingCells.has(key)) return;
    if ([...savingCells].some((item) => item.startsWith(`${row.id}:`))) return;

    const previous = row.months.find((cell) => cell.month === month)?.status ?? null;
    if (previous === status) return;

    const sequence = (rowSequenceRef.current.get(row.id) ?? 0) + 1;
    rowSequenceRef.current.set(row.id, sequence);

    setCellError(null);
    setNotice(null);
    // Optimistic: the grid reacts immediately; a failure rolls this cell back.
    setRows((current) =>
      current.map((item) =>
        item.id === row.id ? applyMonth(item, month, status) : item,
      ),
    );
    setSavingCells((current) => new Set(current).add(key));

    let failureMessage = `Gagal menyimpan status ${label}. Periksa koneksi lalu coba lagi.`;
    try {
      const response = await fetch(
        `/api/green-building-esg/esg-assessments/${row.id}/months/${month}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      if (!response.ok) {
        failureMessage = await readEsgApiError(
          response,
          `Gagal menyimpan status ${label}.`,
        );
        throw new Error("SAVE_FAILED");
      }
      const body = (await response.json()) as { data?: unknown };
      if (!isEsgAssessment(body.data)) throw new Error("INVALID_RESPONSE");
      // A newer write on the same row already replaced this one's result.
      if (rowSequenceRef.current.get(row.id) !== sequence) return;
      const saved = body.data;
      setRows((current) =>
        current.map((item) => (item.id === row.id ? saved : item)),
      );
      setNotice(`Status ${label} diperbarui.`);
    } catch {
      if (rowSequenceRef.current.get(row.id) === sequence) {
        setRows((current) =>
          current.map((item) =>
            item.id === row.id ? applyMonth(item, month, previous) : item,
          ),
        );
      }
      setCellError({ rowId: row.id, month, status, message: failureMessage });
    } finally {
      setSavingCells((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }

  function retryCellError(): void {
    if (!cellError) return;
    const row = rows.find((item) => item.id === cellError.rowId);
    if (!row) {
      setCellError(null);
      return;
    }
    void handleMonthChange(row, cellError.month, cellError.status);
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
            Penilaian ESG
          </h1>
          <p className="mt-1 max-w-3xl text-base text-primary/70">
            Kelola status bulanan penilaian ESG per Master Project dan tahun.
          </p>
        </div>
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
                htmlFor="esg-search"
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
                  id="esg-search"
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
                htmlFor="esg-year"
                className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-primary/50"
              >
                Tahun
              </label>
              <select
                id="esg-year"
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
          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <div className="flex items-center gap-3 text-xs font-semibold text-primary/60">
              {!loading ? <span>{rows.length} penilaian</span> : null}
              <span aria-live="polite" className="text-secondary">
                {refreshing ? "Memperbarui data..." : ""}
              </span>
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
                <span>Tambah ESG</span>
              </button>
            ) : null}
          </div>
        </div>

        {cellError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
          >
            <span>{cellError.message}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={retryCellError}
                className="rounded border border-red-300 bg-white px-3 py-1.5 font-bold text-red-700 transition-colors hover:bg-red-100"
              >
                Coba Lagi
              </button>
              <button
                type="button"
                onClick={() => setCellError(null)}
                aria-label="Tutup pesan kesalahan"
                className="rounded p-1 text-red-700 hover:bg-red-100"
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
          <EsgTable
            rows={rows}
            initialLoading={loading && rows.length === 0}
            emptyMessage={emptyMessage}
            emptyActionLabel={hasFilters ? "Reset Filter" : undefined}
            onEmptyAction={hasFilters ? resetFilters : undefined}
            canManage={canManage}
            savingCells={savingCells}
            onMonthChange={(row, month, status) =>
              void handleMonthChange(row, month, status)
            }
            onEdit={(row) => setDialog({ mode: "edit", record: row })}
            onDelete={(row) => setDeleteTarget(row)}
          />
        )}
      </section>

      {dialog ? (
        <EsgFormDialog
          mode={dialog.mode}
          record={dialog.mode === "edit" ? dialog.record : undefined}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {deleteTarget ? (
        <EsgDeleteDialog
          record={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      ) : null}
    </div>
  );
}
