"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EngineeringDatabaseCategoryCoverageChart from "@/components/dashboard/engineering-database/EngineeringDatabaseCategoryCoverageChart";
import EngineeringDatabaseProjectCompletenessChart from "@/components/dashboard/engineering-database/EngineeringDatabaseProjectCompletenessChart";
import EngineeringDatabaseSummaryTable from "@/components/dashboard/engineering-database/EngineeringDatabaseSummaryTable";
import {
  buildCategoryCoverage,
  buildProjectCompleteness,
  type EngineeringDatabaseSummary,
} from "@/lib/engineering-database/summary";

// Summary Report — read-only for every role.
// ONE request feeds the matrix and both charts; the chart values are derived
// from the same presence summary, so they can never disagree with the matrix
// and no per-cell or per-project request is issued.

const SUMMARY_ENDPOINT = "/api/engineering-database/summary";
const FRIENDLY_ERROR = "Gagal memuat Summary Engineering Database.";
const ACCESS_ERROR =
  "Anda tidak memiliki akses ke Summary Engineering Database.";

function isSummary(value: unknown): value is EngineeringDatabaseSummary {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as { categories?: unknown; rows?: unknown };
  if (!Array.isArray(candidate.categories) || !Array.isArray(candidate.rows)) {
    return false;
  }
  return candidate.rows.every((row) => {
    if (typeof row !== "object" || row === null) {
      return false;
    }
    const item = row as {
      projectId?: unknown;
      name?: unknown;
      location?: unknown;
      has?: unknown;
    };
    return (
      typeof item.projectId === "string" &&
      typeof item.name === "string" &&
      typeof item.location === "string" &&
      typeof item.has === "object" &&
      item.has !== null
    );
  });
}

async function requestSummary(signal: AbortSignal): Promise<EngineeringDatabaseSummary> {
  const response = await fetch(SUMMARY_ENDPOINT, {
    signal,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(response.status === 401 || response.status === 403 ? ACCESS_ERROR : FRIENDLY_ERROR);
  }

  const body = (await response.json()) as { data?: unknown };
  if (!isSummary(body.data)) {
    throw new Error(FRIENDLY_ERROR);
  }
  return body.data;
}

function ChartSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-lg border border-outline bg-surface p-5 shadow-sm"
    >
      <div className="h-3 w-64 animate-pulse rounded bg-slate-200" />
      <div className="mt-2 h-3 w-80 animate-pulse rounded bg-slate-100" />
      <div className="mt-5 h-64 animate-pulse rounded-lg bg-slate-50" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-lg border border-outline bg-surface p-5 shadow-sm"
    >
      <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mt-2 h-3 w-72 animate-pulse rounded bg-slate-100" />
      <div className="mt-5 space-y-3">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="h-8 animate-pulse rounded bg-slate-50" />
        ))}
      </div>
    </div>
  );
}

export default function EngineeringDatabaseSummaryPage() {
  const [summary, setSummary] = useState<EngineeringDatabaseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const requestIdRef = useRef(0);

  // The loading flags are set from the retry handler (an event), not from the
  // effect body: the effect only starts the request and settles the state from
  // its async callbacks.
  const reload = useCallback(() => {
    setSummary(null);
    setError(null);
    setLoading(true);
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let active = true;

    void (async () => {
      try {
        const body = await requestSummary(controller.signal);
        if (active && requestId === requestIdRef.current) {
          setSummary(body);
        }
      } catch (err) {
        if (active && !controller.signal.aborted && requestId === requestIdRef.current) {
          setSummary(null);
          // Only the friendly messages produced above are ever displayed — a
          // raw backend error, status text or stack never reaches the page.
          setError(
            err instanceof Error && err.message !== "" ? err.message : FRIENDLY_ERROR,
          );
        }
      } finally {
        if (active && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken]);

  const coverage = useMemo(
    () => (summary ? buildCategoryCoverage(summary) : []),
    [summary],
  );
  const completeness = useMemo(
    () => (summary ? buildProjectCompleteness(summary) : []),
    [summary],
  );

  const initialLoading = loading && summary === null;

  return (
    <div className="space-y-6">
      <div className="border-b border-outline pb-4">
        <div className="mb-1 flex items-center gap-2">
          <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
            Core Enterprise
          </span>
          <span className="text-xs text-primary/50">•</span>
          <span className="text-xs text-primary/50">Engineering Databases</span>
        </div>
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Summary Report
          </h1>
          {loading && summary !== null ? (
            <span
              role="status"
              className="inline-flex items-center gap-2 self-start rounded-full border border-outline bg-white px-3 py-1.5 text-xs font-semibold text-primary/60 shadow-sm"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
              Memperbarui data...
            </span>
          ) : null}
        </div>
        <p className="mt-1 max-w-3xl text-base text-primary/70">
          Ringkasan ketersediaan enam komponen Engineering Database berdasarkan
          Master Project.
        </p>
      </div>

      {initialLoading ? (
        <>
          <ChartSkeleton />
          <ChartSkeleton />
          <TableSkeleton />
        </>
      ) : error !== null ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm"
        >
          <p className="text-sm font-bold text-red-800">{error}</p>
          {error === FRIENDLY_ERROR ? (
            <p className="mt-1 text-xs text-red-700">
              Periksa koneksi lalu coba kembali.
            </p>
          ) : null}
          <button
            type="button"
            onClick={reload}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      ) : summary !== null ? (
        <>
          <EngineeringDatabaseCategoryCoverageChart rows={coverage} />
          <EngineeringDatabaseProjectCompletenessChart rows={completeness} />
          <EngineeringDatabaseSummaryTable rows={summary.rows} />
        </>
      ) : null}
    </div>
  );
}
