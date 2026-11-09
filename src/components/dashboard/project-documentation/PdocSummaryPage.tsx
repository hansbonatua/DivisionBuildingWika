"use client";

import { useEffect, useMemo, useState } from "react";

// Project Documentation Summary Report.
//
// One request returns every Master Project crossed with twelve months. The API
// already expands projects without documentation to 0/5, so this page never
// hides a project or substitutes a dash for an empty month.

type SummaryMonth = {
  month: number;
  label: string;
};

type SummaryMonthValue = {
  month: number;
  completed_weeks: number;
  total_weeks: number;
  documented: boolean;
};

type SummaryProject = {
  project_id: string;
  project_name: string;
  project_location: string;
  project_year: number;
  months: SummaryMonthValue[];
};

type SummaryPayload = {
  year: number;
  available_years: number[];
  months: SummaryMonth[];
  rows: SummaryProject[];
};

const FALLBACK_MONTHS: SummaryMonth[] = [
  { month: 1, label: "Jan" },
  { month: 2, label: "Feb" },
  { month: 3, label: "Mar" },
  { month: 4, label: "Apr" },
  { month: 5, label: "Mei" },
  { month: 6, label: "Jun" },
  { month: 7, label: "Jul" },
  { month: 8, label: "Agu" },
  { month: 9, label: "Sep" },
  { month: 10, label: "Okt" },
  { month: 11, label: "Nov" },
  { month: 12, label: "Des" },
];

function jakartaYear(): number {
  const value = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
    }).format(new Date()),
  );
  return Number.isInteger(value) && value >= 2000
    ? value
    : new Date().getFullYear();
}

function buildYearOptions(selectedYear: number, years: number[]): number[] {
  return [...new Set([selectedYear, jakartaYear(), ...years])]
    .filter((year) => Number.isInteger(year) && year >= 2000)
    .sort((left, right) => right - left);
}

export function summaryCellClass(completedWeeks: number, totalWeeks: number): string {
  if (totalWeeks > 0 && completedWeeks >= totalWeeks) {
    return "bg-green-100 text-green-800";
  }
  if (completedWeeks > 0) {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-slate-100 text-slate-500";
}

const headerCell =
  "whitespace-nowrap border-b border-outline bg-background px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";
const bodyCell = "border-b border-outline/50 px-3 py-3 align-middle text-xs";

export default function PdocSummaryPage() {
  const [selectedYear, setSelectedYear] = useState(() => jakartaYear());
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const yearOptions = useMemo(
    () => buildYearOptions(selectedYear, availableYears),
    [availableYears, selectedYear],
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadSummary(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/project-documentation/summary?year=${selectedYear}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as { data?: SummaryPayload };
        if (
          !body.data ||
          !Array.isArray(body.data.rows) ||
          !Array.isArray(body.data.months)
        ) {
          throw new Error("INVALID_RESPONSE");
        }
        if (!active || controller.signal.aborted) return;
        setSummary(body.data);
        setAvailableYears(
          Array.isArray(body.data.available_years)
            ? body.data.available_years.filter(
                (year) => Number.isInteger(year) && year >= 2000,
              )
            : [],
        );
      } catch {
        if (!active || controller.signal.aborted) return;
        setError(
          "Gagal memuat Summary Project Documentation. Periksa koneksi lalu coba lagi.",
        );
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    }

    void loadSummary();
    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken, selectedYear]);

  const rows = summary?.rows ?? [];
  const months =
    summary?.months.length === 12 ? summary.months : FALLBACK_MONTHS;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline pb-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
              Core Enterprise
            </span>
            <span className="text-xs text-primary/50">•</span>
            <span className="text-xs text-primary/50">Project Documentation</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Summary Report Project Documentation
          </h1>
          <p className="mt-1 max-w-3xl text-base text-primary/70">
            Matriks kelengkapan dokumentasi seluruh Master Project per bulan.
            Halaman ini hanya-baca.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-outline/60 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-xs">
            <label
              htmlFor="pdoc-summary-year"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Tahun Dokumentasi
            </label>
            <select
              id="pdoc-summary-year"
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="h-10 w-full rounded-lg border border-outline/60 bg-white px-3 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] font-semibold text-primary/50">
            {rows.length} project ditampilkan.
          </p>
        </div>
      </section>

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

      <section className="rounded-2xl border border-outline/60 bg-white shadow-sm">
        {loading && summary === null ? (
          <div className="space-y-3 p-6" aria-live="polite">
            <p className="text-xs font-medium text-primary/60">
              Memuat Summary Project Documentation...
            </p>
            <div className="h-10 animate-pulse rounded-lg bg-background" />
            <div className="h-16 animate-pulse rounded-lg bg-background" />
            <div className="h-16 animate-pulse rounded-lg bg-background" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-bold text-primary">
              Belum ada Master Project.
            </p>
            <p className="mt-1 text-xs text-primary/60">
              Tambahkan Master Project untuk mengisi Summary ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-xs">
              <caption className="sr-only">
                Matriks kelengkapan Project Documentation seluruh Master Project
                per bulan
              </caption>
              <thead className="sticky top-0 z-20">
                <tr>
                  <th scope="col" className={`${headerCell} min-w-[240px]`}>
                    Nama Proyek
                  </th>
                  {months.map((month) => (
                    <th key={month.month} scope="col" className={`${headerCell} text-center`}>
                      {month.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((project) => (
                  <tr
                    key={project.project_id}
                    className="transition-colors hover:bg-background/60"
                  >
                    <th scope="row" className={`${bodyCell} text-left`}>
                      <span className="block font-bold text-primary">
                        {project.project_name}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-medium text-primary/50">
                        {project.project_location} · {project.project_year}
                      </span>
                    </th>
                    {months.map((month) => {
                      const value = project.months.find(
                        (item) => item.month === month.month,
                      );
                      const completed = value?.completed_weeks ?? 0;
                      const total = value?.total_weeks ?? 5;
                      return (
                        <td
                          key={month.month}
                          className={`${bodyCell} text-center font-bold ${summaryCellClass(
                            completed,
                            total,
                          )}`}
                          title={`${month.label}: ${completed}/${total}`}
                        >
                          {completed}/{total}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
