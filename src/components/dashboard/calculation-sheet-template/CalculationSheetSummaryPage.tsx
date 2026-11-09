"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  filterCstRows,
  type CstSummaryFilter,
  type CstTemplateRow,
} from "@/lib/calculation-sheet-template/cst-draft";
import {
  CST_CATEGORIES,
  getCstCategoryLabel,
  type CstCategoryId,
} from "@/lib/calculation-sheet-template/constants";

// Calculation Sheet Template Summary Report.
//
// One request loads the whole master list (GET without `kategori`); category,
// PIC and free-text filtering happens client-side, so changing a filter never
// hits the server. The PDF is built from the rows currently on screen.

const EMPTY_FILTERS: CstSummaryFilter = {
  kategori: "",
  picUserId: "",
  search: "",
};

const headerCell =
  "whitespace-nowrap border-b border-outline bg-background px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";
const bodyCell = "border-b border-outline/50 px-3 py-3 align-top text-xs text-primary/80";

export default function CalculationSheetSummaryPage() {
  const [rows, setRows] = useState<CstTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [filters, setFilters] = useState<CstSummaryFilter>(EMPTY_FILTERS);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let active = true;

    async function loadSummary(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/calculation-sheet-template", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as {
          data?: { rows?: CstTemplateRow[] };
        };
        if (!body.data || !Array.isArray(body.data.rows)) {
          throw new Error("INVALID_RESPONSE");
        }
        if (!active || requestId !== requestIdRef.current) return;
        setRows(body.data.rows);
      } catch {
        if (!active || controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        setError(
          "Gagal memuat Summary Calculation Sheet Template. Periksa koneksi lalu coba lagi.",
        );
      } finally {
        if (active && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }

    void loadSummary();
    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken]);

  const filteredRows = useMemo(
    () => filterCstRows(rows, filters),
    [rows, filters],
  );

  // Summary is read-only, so PIC options come from the loaded rows instead of
  // the manage-only /pic-options endpoint.
  const picOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const row of rows) {
      byId.set(row.pic.user_id, row.pic.name);
    }
    return [...byId.entries()]
      .map(([user_id, name]) => ({ user_id, name }))
      .sort((left, right) => left.name.localeCompare(right.name, "id"));
  }, [rows]);

  const activeCategory = CST_CATEGORIES.find(
    (category) => category.id === filters.kategori,
  );
  const activePic = picOptions.find((pic) => pic.user_id === filters.picUserId);

  const hasFilters =
    filters.kategori !== "" ||
    filters.picUserId !== "" ||
    filters.search.trim() !== "";

  function describeFilters(): string {
    const parts = [`${filteredRows.length} baris`];
    parts.push(`Kategori: ${activeCategory?.label ?? "Semua"}`);
    parts.push(`PIC: ${activePic?.name ?? "Semua"}`);
    if (filters.search.trim() !== "") {
      parts.push(`Pencarian: "${filters.search.trim()}"`);
    }
    return parts.join("  |  ");
  }

  async function downloadPdf(): Promise<void> {
    if (pdfBusy || filteredRows.length === 0) return;
    setPdfBusy(true);
    setPdfError(null);
    try {
      const exporter = await import(
        "@/components/dashboard/calculation-sheet-template/cstSummaryExportPdf"
      );
      await exporter.downloadCstSummaryPdf(filteredRows, describeFilters());
    } catch {
      setPdfError("Gagal menyiapkan PDF. Coba lagi.");
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline pb-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
              Core Enterprise
            </span>
            <span className="text-xs text-primary/50">•</span>
            <span className="text-xs text-primary/50">Calculation Sheet Template</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Summary Report Calculation Sheet Template
          </h1>
          <p className="mt-1 max-w-3xl text-base text-primary/70">
            Rekap master reference seluruh kategori. Filter berjalan di sisi klien.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-outline/60 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[200px_220px_1fr_auto]">
          <div>
            <label
              htmlFor="cst-summary-kategori"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Kategori
            </label>
            <select
              id="cst-summary-kategori"
              value={filters.kategori}
              disabled={loading}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  kategori: event.target.value as CstCategoryId | "",
                }))
              }
              className="h-10 w-full rounded-lg border border-outline/60 bg-white px-3 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              <option value="">Semua kategori</option>
              {CST_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="cst-summary-pic"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              PIC
            </label>
            <select
              id="cst-summary-pic"
              value={filters.picUserId}
              disabled={loading}
              onChange={(event) =>
                setFilters((current) => ({ ...current, picUserId: event.target.value }))
              }
              className="h-10 w-full rounded-lg border border-outline/60 bg-white px-3 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              <option value="">Semua PIC</option>
              {picOptions.map((pic) => (
                <option key={pic.user_id} value={pic.user_id}>
                  {pic.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="cst-summary-search"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Pencarian
            </label>
            <input
              id="cst-summary-search"
              type="search"
              value={filters.search}
              disabled={loading}
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
              placeholder="Cari kode atau nama..."
              className="h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              disabled={!hasFilters || loading}
              className="h-10 rounded-lg border border-outline bg-white px-4 text-xs font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </div>

        <p className="mt-3 text-[11px] font-semibold text-primary/50">
          {filteredRows.length} dari {rows.length} baris ditampilkan.
        </p>
      </section>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-bold text-primary">Rekap Calculation Sheet</h2>
          <p className="mt-0.5 text-xs text-primary/50">
            Semua kategori, hanya-baca.
          </p>
          {pdfError ? (
            <p role="alert" className="mt-1 text-[11px] font-semibold text-red-700">
              {pdfError}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void downloadPdf()}
          disabled={loading || filteredRows.length === 0 || pdfBusy}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-outline bg-white px-4 text-xs font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M9 15h6" />
            <path d="M9 18h6" />
          </svg>
          <span>{pdfBusy ? "Menyiapkan..." : "Export PDF"}</span>
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              setRows([]);
              setReloadToken((token) => token + 1);
            }}
            className="rounded border border-red-300 bg-white px-3 py-1.5 font-bold text-red-700 transition-colors hover:bg-red-100"
          >
            Coba Lagi
          </button>
        </div>
      ) : null}

      <section className="rounded-2xl border border-outline/60 bg-white shadow-sm">
        {loading && rows.length === 0 ? (
          <div className="space-y-3 p-6" aria-live="polite">
            <p className="text-xs font-medium text-primary/60">
              Memuat Summary Calculation Sheet Template...
            </p>
            <div className="h-10 animate-pulse rounded-lg bg-background" />
            <div className="h-14 animate-pulse rounded-lg bg-background" />
            <div className="h-14 animate-pulse rounded-lg bg-background" />
          </div>
        ) : error && rows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-bold text-primary">
              Gagal memuat Summary Calculation Sheet Template.
            </p>
            <p className="mt-1 text-xs text-primary/60">Periksa koneksi lalu coba kembali.</p>
            <button
              type="button"
              onClick={() => setReloadToken((token) => token + 1)}
              className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
            >
              Coba Lagi
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-bold text-primary">
              Belum ada data Calculation Sheet Template.
            </p>
            <p className="mt-1 text-xs text-primary/60">
              Tambahkan baris pada halaman kategori untuk mengisi rekap ini.
            </p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-bold text-primary">
              Tidak ada baris untuk filter yang dipilih.
            </p>
            <p className="mt-1 text-xs text-primary/60">
              Ubah kategori, PIC, atau kata kunci, atau reset filter.
            </p>
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
            >
              Reset filter
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <caption className="sr-only">
                Summary Calculation Sheet Template seluruh kategori
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={`${headerCell} min-w-40`}>
                    Kategori
                  </th>
                  <th scope="col" className={`${headerCell} w-32`}>
                    Kode
                  </th>
                  <th scope="col" className={`${headerCell} min-w-56`}>
                    Nama
                  </th>
                  <th scope="col" className={`${headerCell} min-w-44`}>
                    PIC
                  </th>
                  <th scope="col" className={`${headerCell} min-w-44`}>
                    Evidence
                  </th>
                  <th scope="col" className={`${headerCell} min-w-56`}>
                    Catatan
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} className="bg-white transition-colors hover:bg-background/60">
                    <td className={`${bodyCell} whitespace-nowrap font-semibold text-primary`}>
                      {getCstCategoryLabel(row.kategori) ?? row.kategori}
                    </td>
                    <td className={`${bodyCell} whitespace-nowrap`}>
                      <span className="font-mono text-[11px] font-bold text-primary">
                        {row.kode}
                      </span>
                    </td>
                    <td className={`${bodyCell} min-w-56`}>
                      <span className="block font-semibold text-primary">{row.nama}</span>
                    </td>
                    <td className={`${bodyCell} min-w-44`}>
                      <span className="block text-[11px] font-semibold text-primary/75">
                        {row.pic.status === "active"
                          ? row.pic.name
                          : `${row.pic.name} (non-aktif)`}
                      </span>
                    </td>
                    <td className={`${bodyCell} min-w-44`}>
                      {row.evidence_url ? (
                        <a
                          href={row.evidence_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={row.evidence_url}
                          className="block max-w-[200px] truncate text-[11px] font-semibold text-secondary underline decoration-secondary/30 underline-offset-2 hover:decoration-secondary"
                        >
                          {row.evidence_url}
                        </a>
                      ) : (
                        <span className="text-primary/40">—</span>
                      )}
                    </td>
                    <td className={`${bodyCell} min-w-56`}>
                      {row.catatan ? (
                        <span
                          title={row.catatan}
                          className="block max-w-[260px] overflow-hidden text-[11px] font-medium leading-snug text-primary/70 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                        >
                          {row.catatan}
                        </span>
                      ) : (
                        <span className="text-primary/40">—</span>
                      )}
                    </td>
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
