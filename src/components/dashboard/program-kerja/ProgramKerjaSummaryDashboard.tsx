"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ProgramKerjaGroupChart from "@/components/dashboard/program-kerja/ProgramKerjaGroupChart";
import ProgramKerjaStatusChart from "@/components/dashboard/program-kerja/ProgramKerjaStatusChart";
import type { ProgramKerjaSummaryResponse } from "@/lib/program-kerja/summaryService";

type FilterKey = "year" | "groupId" | "unit" | "picId";

type FilterSelection = {
  year: string;
  groupId: string;
  unit: string;
  picId: string;
};

const EMPTY_FILTERS: FilterSelection = {
  year: "",
  groupId: "",
  unit: "",
  picId: "",
};

const FILTER_KEYS: readonly FilterKey[] = ["year", "groupId", "unit", "picId"];

const controlClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/40";

const countFormatter = new Intl.NumberFormat("id-ID");
const achievementFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});
const shareFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
});

function buildSummaryUrl(filters: FilterSelection): string {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = filters[key].trim();
    if (value !== "") {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query === "" ? "/api/program-kerja/summary" : `/api/program-kerja/summary?${query}`;
}

function formatCount(value: number): string {
  return countFormatter.format(value);
}

function formatAchievement(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }
  return `${achievementFormatter.format(value)}%`;
}

function formatShare(part: number, total: number): string {
  const percent = total > 0 ? (part / total) * 100 : 0;
  return `${shareFormatter.format(percent)}% dari total program`;
}

function readErrorMessage(body: unknown): string | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const error = (body as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) {
    return null;
  }
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.trim() !== "" ? message : null;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error && error.message !== ""
    ? error.message
    : "Gagal memuat Summary Report Program Kerja.";
}

async function requestSummary(
  selection: FilterSelection,
  signal: AbortSignal,
): Promise<ProgramKerjaSummaryResponse> {
  const response = await fetch(buildSummaryUrl(selection), {
    signal,
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Anda tidak memiliki akses ke Summary Report Program Kerja.");
    }
    let message = "Gagal memuat Summary Report Program Kerja.";
    try {
      message = readErrorMessage(await response.json()) ?? message;
    } catch {
      /* keep the friendly fallback */
    }
    throw new Error(message);
  }

  const body = (await response.json()) as ProgramKerjaSummaryResponse;
  if (!body || typeof body !== "object" || !body.kpis || !body.filters || !body.options) {
    throw new Error("Respons Summary Report tidak valid.");
  }
  return body;
}

export default function ProgramKerjaSummaryDashboard() {
  const [filters, setFilters] = useState<FilterSelection>(EMPTY_FILTERS);
  const [summary, setSummary] = useState<ProgramKerjaSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const loadSummary = useCallback(async (selection: FilterSelection): Promise<void> => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const body = await requestSummary(selection, controller.signal);
      if (requestId === requestIdRef.current) {
        setSummary(body);
      }
    } catch (err) {
      if (!controller.signal.aborted && requestId === requestIdRef.current) {
        setError(toErrorMessage(err));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const controller = new AbortController();
    abortRef.current = controller;

    void (async () => {
      try {
        const body = await requestSummary(EMPTY_FILTERS, controller.signal);
        if (requestId === requestIdRef.current) {
          setSummary(body);
        }
      } catch (err) {
        if (!controller.signal.aborted && requestId === requestIdRef.current) {
          setError(toErrorMessage(err));
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, []);

  function refreshSummary(selection: FilterSelection): void {
    setLoading(true);
    setError(null);
    void loadSummary(selection);
  }

  function handleFilterChange(key: FilterKey, value: string): void {
    const next = { ...filters, [key]: value };
    setFilters(next);
    refreshSummary(next);
  }

  function handleReset(): void {
    setFilters(EMPTY_FILTERS);
    refreshSummary(EMPTY_FILTERS);
  }

  const initialLoading = loading && summary === null;
  const hasActiveFilters = FILTER_KEYS.some((key) => filters[key] !== "");
  const resolvedYear = summary?.filters.year ?? null;
  const explicitYear = Number(filters.year);
  const yearValues = [
    ...new Set([
      ...(summary?.options.years ?? []),
      ...(resolvedYear !== null ? [resolvedYear] : []),
      ...(filters.year !== "" && Number.isInteger(explicitYear) ? [explicitYear] : []),
    ]),
  ].sort((a, b) => b - a);
  const selectedYear = filters.year !== "" ? filters.year : resolvedYear !== null ? String(resolvedYear) : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
              Core Enterprise
            </span>
            <span className="text-xs text-primary/50">•</span>
            <span className="text-xs text-primary/50">Summary Report</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Summary Report Program Kerja
          </h1>
          <p className="max-w-3xl text-base text-primary/70">
            Monitor pencapaian program kerja engineering berdasarkan rencana dan realisasi.
          </p>
        </div>
        {loading && summary ? (
          <span
            role="status"
            className="inline-flex items-center gap-2 self-start rounded-full border border-outline bg-white px-3 py-1.5 text-xs font-semibold text-primary/60 shadow-sm lg:self-center"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
            Memperbarui data...
          </span>
        ) : null}
      </div>

      <section
        aria-label="Filter Summary Report"
        className="grid grid-cols-1 gap-3 rounded-lg border border-outline bg-surface p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end"
      >
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-primary/50">
            Tahun
          </span>
          <select
            value={selectedYear}
            onChange={(event) => handleFilterChange("year", event.target.value)}
            disabled={initialLoading}
            aria-label="Filter Tahun"
            className={controlClass}
          >
            {selectedYear === "" ? (
              <option value="" disabled>
                {initialLoading ? "Memuat..." : "Pilih tahun"}
              </option>
            ) : null}
            {yearValues.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-primary/50">
            Kelompok Program
          </span>
          <select
            value={filters.groupId}
            onChange={(event) => handleFilterChange("groupId", event.target.value)}
            disabled={initialLoading}
            aria-label="Filter Kelompok Program"
            className={controlClass}
          >
            <option value="">Semua Kelompok</option>
            {(summary?.options.groups ?? []).map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-primary/50">
            Unit
          </span>
          <select
            value={filters.unit}
            onChange={(event) => handleFilterChange("unit", event.target.value)}
            disabled={initialLoading}
            aria-label="Filter Unit"
            className={controlClass}
          >
            <option value="">Semua Unit</option>
            <option value="Jumlah">Jumlah</option>
            <option value="Persentase">Persentase</option>
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-primary/50">
            PIC
          </span>
          <select
            value={filters.picId}
            onChange={(event) => handleFilterChange("picId", event.target.value)}
            disabled={initialLoading}
            aria-label="Filter PIC"
            className={controlClass}
          >
            <option value="">Semua PIC</option>
            {(summary?.options.pics ?? []).map((pic) => (
              <option key={pic.id} value={pic.id}>
                {pic.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={handleReset}
          disabled={!hasActiveFilters}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-outline bg-white px-4 text-xs font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 xl:col-span-1"
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
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>Reset Filter</span>
        </button>
      </section>

      {error && summary ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-xs font-bold text-red-800">
              Gagal memperbarui data Summary Report.
            </p>
            <p className="mt-0.5 text-xs text-red-700">{error}</p>
            <p className="mt-0.5 text-xs text-red-700/80">
              Data yang tampil adalah hasil filter terakhir yang berhasil dimuat.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refreshSummary(filters)}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-red-300 bg-white px-3 text-xs font-bold text-red-700 transition-colors hover:bg-red-100"
          >
            Coba Lagi
          </button>
        </div>
      ) : null}

      {initialLoading ? (
        <>
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-busy="true"
            aria-label="Memuat KPI Summary Report"
          >
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                aria-hidden="true"
                className="rounded-lg border border-outline bg-surface p-5 shadow-sm"
              >
                <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
                <div className="mt-4 h-8 w-16 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-3 w-24 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
          <div
            className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
            aria-hidden="true"
          >
            <div className="rounded-lg border border-outline bg-surface p-5 shadow-sm">
              <div className="h-3 w-36 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-3 w-52 animate-pulse rounded bg-slate-100" />
              <div className="mx-auto mt-6 h-44 w-44 animate-pulse rounded-full border-[16px] border-slate-100 bg-slate-50" />
              <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-2">
                {[0, 1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-3 animate-pulse rounded bg-slate-100"
                  />
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-outline bg-surface p-5 shadow-sm">
              <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-3 w-60 animate-pulse rounded bg-slate-100" />
              <div className="mt-6 space-y-4">
                {[0, 1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-4 animate-pulse rounded bg-slate-100"
                    style={{ width: `${72 + item * 6}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      ) : error && !summary ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm"
        >
          <p className="text-sm font-bold text-red-800">
            Gagal memuat Summary Report Program Kerja.
          </p>
          <p className="mt-1 text-xs text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => refreshSummary(filters)}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      ) : summary ? (
        <>
          <div
            className={`grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-4 ${
              loading ? "opacity-60" : "opacity-100"
            }`}
            aria-busy={loading}
          >
            <div className="flex h-full flex-col rounded-lg border border-outline bg-surface p-5 shadow-sm">
              <p className="text-xs font-semibold text-primary/60">Total Program Kerja</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-primary">
                {formatCount(summary.kpis.totalPrograms)}
              </p>
              <p className="mt-auto pt-2 text-xs text-primary/50">program</p>
            </div>

            <div className="flex h-full flex-col rounded-lg border border-outline bg-surface p-5 shadow-sm">
              <p className="text-xs font-semibold text-primary/60">Program dengan RI</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-primary">
                {formatCount(summary.kpis.programsWithRi)}
              </p>
              <p className="mt-auto pt-2 text-xs text-primary/50">
                {formatShare(summary.kpis.programsWithRi, summary.kpis.totalPrograms)}
              </p>
            </div>

            <div className="flex h-full flex-col rounded-lg border border-outline bg-surface p-5 shadow-sm">
              <p className="text-xs font-semibold text-primary/60">Program Belum Ada RI</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-primary">
                {formatCount(summary.kpis.programsWithoutRi)}
              </p>
              <p className="mt-auto pt-2 text-xs text-primary/50">
                {formatShare(summary.kpis.programsWithoutRi, summary.kpis.totalPrograms)}
              </p>
            </div>

            <div className="flex h-full flex-col rounded-lg border border-outline bg-surface p-5 shadow-sm">
              <p className="text-xs font-semibold text-primary/60">Rata-Rata Pencapaian</p>
              {summary.filters.unit === null ? (
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-primary/60">Jumlah</span>
                    <span className="text-xl font-bold tracking-tight text-primary">
                      {formatAchievement(summary.kpis.averageAchievement.jumlah)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-primary/60">Persentase</span>
                    <span className="text-xl font-bold tracking-tight text-primary">
                      {formatAchievement(summary.kpis.averageAchievement.persentase)}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-primary">
                    {formatAchievement(
                      summary.filters.unit === "Jumlah"
                        ? summary.kpis.averageAchievement.jumlah
                        : summary.kpis.averageAchievement.persentase,
                    )}
                  </p>
                  <p className="mt-auto pt-2 text-xs text-primary/50">
                    {summary.filters.unit}
                  </p>
                </>
              )}
            </div>
          </div>

          {summary.kpis.totalPrograms === 0 ? (
            <div className="rounded-lg border border-outline bg-surface px-4 py-6 text-center shadow-sm">
              <p className="text-sm font-medium text-primary/70">
                Tidak ada Program Kerja untuk filter yang dipilih.
              </p>
            </div>
          ) : null}

          <section
            className={`grid grid-cols-1 gap-4 transition-opacity xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] ${
              loading ? "opacity-60" : "opacity-100"
            }`}
            aria-label="Visualisasi Summary Report"
            aria-busy={loading}
          >
            <ProgramKerjaStatusChart
              distribution={summary.statusDistribution}
              totalPrograms={summary.kpis.totalPrograms}
            />
            <ProgramKerjaGroupChart
              groups={summary.groups}
              unit={summary.filters.unit}
            />
          </section>
        </>
      ) : null}
    </div>
  );
}
