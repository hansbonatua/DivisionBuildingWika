"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { DISIPLIN_LIST } from "@/lib/metode-kerja-standar/constants";
import {
  buildSummaryTree,
  filterSummaryRows,
  type SummaryFilter,
  type SummaryRow,
  type SummaryRowStatus,
} from "@/lib/metode-kerja-standar/summary";

// Metode Kerja Standar Summary Report.
//
// One request loads every discipline, sub-kategori and item; disiplin/PIC/search
// filtering happens client-side (D-MKS-02), so changing a filter never hits the
// server. The PDF is built from the rows currently on screen, so the export can
// never disagree with the table.
//
// All six disciplines always appear, including empty ones: F. Lainnya stays
// visible with "Belum ada sub-kategori" / "Belum ada item" instead of being
// dropped (D-D-03).
//
// Rows are grouped under one full-width discipline header (A. Struktur,
// B. Perencanaan, …) the way Program Kerja does it, so the discipline is no
// longer repeated in every row. Grouping runs on the already-filtered rows, so
// a PIC/search filter never resurrects a discipline the filter excluded.

const headerCell =
  "whitespace-nowrap border-b border-outline bg-background px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";
const bodyCell = "border-b border-outline/50 px-3 py-3 align-top text-xs text-primary/80";
const disiplinHeaderCell =
  "border-y border-primary/30 bg-primary px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-white";

// Sub-Kategori, Item, PIC, Evidence, Status: Disiplin moved into the group
// header row below, so it no longer needs a column of its own.
export const SUMMARY_COLUMN_COUNT = 5;

const EMPTY_FILTERS: SummaryFilter = {
  disiplin: "",
  picUserId: "",
  search: "",
};

export function summaryStatusLabel(status: SummaryRowStatus): string {
  if (status === "item") return "Item";
  if (status === "sub-kategori-kosong") return "Tanpa item";
  return "Disiplin kosong";
}

export function summaryStatusClass(status: SummaryRowStatus): string {
  if (status === "item") return "border-green-200 bg-green-50 text-green-800";
  if (status === "sub-kategori-kosong") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default function MetodeKerjaSummaryPage() {
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [filters, setFilters] = useState<SummaryFilter>(EMPTY_FILTERS);
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const hasLoadedRef = useRef(false);
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
        const response = await fetch("/api/metode-kerja-standar/summary", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as {
          data?: { rows?: unknown };
        };
        if (!body.data || !Array.isArray(body.data.rows)) {
          throw new Error("INVALID_RESPONSE");
        }
        if (!active || requestId !== requestIdRef.current) return;
        setRows(body.data.rows as SummaryRow[]);
        hasLoadedRef.current = true;
      } catch {
        if (!active || controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        setError(
          "Gagal memuat Summary Metode Kerja Standar. Periksa koneksi lalu coba lagi.",
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
    () => filterSummaryRows(rows, filters),
    [rows, filters],
  );

  // Three-level tree (Disiplin → Sub-Kategori → Item) built from the filtered
  // rows only: a discipline whose every row was filtered out produces no group,
  // and `subKategori[].rows.length` is exactly the amount of rows that will be
  // visible, i.e. the Sub-Kategori rowSpan. Shared with the PDF export.
  const groupedRows = useMemo(() => buildSummaryTree(filteredRows), [filteredRows]);

  // PIC filter options come from the rows themselves: Summary is read-only and
  // /pic-options is a manage-only endpoint.
  const picOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const row of rows) {
      for (const pic of row.pics) {
        byId.set(pic.user_id, pic.name);
      }
    }
    return [...byId.entries()]
      .map(([user_id, name]) => ({ user_id, name }))
      .sort((left, right) => left.name.localeCompare(right.name, "id"));
  }, [rows]);

  const activeDisiplin = DISIPLIN_LIST.find(
    (disiplin) =>
      disiplin.code === filters.disiplin || disiplin.slug === filters.disiplin,
  );
  const activePic = picOptions.find((pic) => pic.user_id === filters.picUserId);

  function describeFilters(): string {
    const parts = [`${filteredRows.length} baris`];
    parts.push(
      `Disiplin: ${activeDisiplin ? `${activeDisiplin.code}. ${activeDisiplin.name}` : "Semua"}`,
    );
    parts.push(`PIC: ${activePic?.name ?? "Semua"}`);
    if ((filters.search ?? "").trim() !== "") {
      parts.push(`Pencarian: "${(filters.search ?? "").trim()}"`);
    }
    return parts.join("  |  ");
  }

  function retryLoad(): void {
    setRows([]);
    setReloadToken((token) => token + 1);
  }

  async function handlePdfExport(action: "view" | "download"): Promise<void> {
    if (pdfBusy || filteredRows.length === 0) return;
    setPdfMenuOpen(false);
    setPdfBusy(true);
    setPdfError(null);
    try {
      const exporter = await import(
        "@/components/dashboard/metode-kerja-standar/metodeKerjaExportPdf"
      );
      const filterLine = describeFilters();
      if (action === "view") {
        await exporter.viewMetodeKerjaSummaryPdf(filteredRows, filterLine);
      } else {
        await exporter.downloadMetodeKerjaSummaryPdf(filteredRows, filterLine);
      }
    } catch {
      setPdfError("Gagal menyiapkan PDF. Izinkan pop-up lalu coba lagi.");
    } finally {
      setPdfBusy(false);
    }
  }

  const hasFilters =
    (filters.disiplin ?? "") !== "" ||
    (filters.picUserId ?? "") !== "" ||
    (filters.search ?? "").trim() !== "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline pb-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
              Core Enterprise
            </span>
            <span className="text-xs text-primary/50">•</span>
            <span className="text-xs text-primary/50">Metode Kerja Standar</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Summary Report Metode Kerja Standar
          </h1>
          <p className="mt-1 max-w-3xl text-base text-primary/70">
            Rekap metode kerja enam disiplin, termasuk sub-kategori dan PIC. Filter
            berjalan di sisi klien.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-outline/60 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[200px_220px_1fr_auto]">
          <div>
            <label
              htmlFor="mks-summary-disiplin"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Disiplin
            </label>
            <select
              id="mks-summary-disiplin"
              value={filters.disiplin ?? ""}
              disabled={loading}
              onChange={(event) =>
                setFilters((current) => ({ ...current, disiplin: event.target.value }))
              }
              className="h-10 w-full rounded-lg border border-outline/60 bg-white px-3 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              <option value="">Semua disiplin</option>
              {DISIPLIN_LIST.map((disiplin) => (
                <option key={disiplin.code} value={disiplin.code}>
                  {disiplin.code}. {disiplin.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="mks-summary-pic"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              PIC
            </label>
            <select
              id="mks-summary-pic"
              value={filters.picUserId ?? ""}
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
              htmlFor="mks-summary-search"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Pencarian
            </label>
            <input
              id="mks-summary-search"
              type="search"
              value={filters.search ?? ""}
              disabled={loading}
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
              placeholder="Cari kode, nama, PIC..."
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
          <h2 className="text-sm font-bold text-primary">Rekap Metode Kerja</h2>
          <p className="mt-0.5 text-xs text-primary/50">
            Enam disiplin selalu ditampilkan, termasuk disiplin yang masih kosong.
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            disabled={loading || filteredRows.length === 0 || pdfBusy}
            aria-expanded={pdfMenuOpen}
            aria-haspopup="menu"
            aria-label="Menu PDF Metode Kerja Standar"
            onClick={() => setPdfMenuOpen((current) => !current)}
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
            <span>{pdfBusy ? "Menyiapkan..." : "PDF"}</span>
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
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {pdfMenuOpen ? (
            <div
              role="menu"
              aria-label="Menu PDF Metode Kerja Standar"
              className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-outline/60 bg-white py-2 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                disabled={pdfBusy}
                onClick={() => void handlePdfExport("view")}
                className="flex w-full items-center px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary disabled:opacity-60"
              >
                View PDF
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={pdfBusy}
                onClick={() => void handlePdfExport("download")}
                className="flex w-full items-center px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary disabled:opacity-60"
              >
                Download PDF
              </button>
            </div>
          ) : null}
          {pdfError ? (
            <p
              role="alert"
              className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700 shadow-lg"
            >
              {pdfError}
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={retryLoad}
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
              Memuat Summary Metode Kerja Standar...
            </p>
            <div className="h-10 animate-pulse rounded-lg bg-background" />
            <div className="h-14 animate-pulse rounded-lg bg-background" />
            <div className="h-14 animate-pulse rounded-lg bg-background" />
          </div>
        ) : error && rows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-bold text-primary">
              Gagal memuat Summary Metode Kerja Standar.
            </p>
            <p className="mt-1 text-xs text-primary/60">
              Periksa koneksi lalu coba kembali.
            </p>
            <button
              type="button"
              onClick={retryLoad}
              className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
            >
              Coba Lagi
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-bold text-primary">
              Belum ada data Metode Kerja Standar.
            </p>
            <p className="mt-1 text-xs text-primary/60">
              Tambahkan sub-kategori pada halaman disiplin untuk mengisi rekap ini.
            </p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-bold text-primary">
              Tidak ada baris untuk filter yang dipilih.
            </p>
            <p className="mt-1 text-xs text-primary/60">
              Ubah disiplin, PIC, atau kata kunci, atau reset filter.
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
            <table className="w-full min-w-[960px] border-collapse text-left">
              <caption className="sr-only">
                Summary Metode Kerja Standar per disiplin, sub-kategori, dan item
              </caption>
              <thead className="sticky top-0 z-20">
                <tr>
                  <th scope="col" className={`${headerCell} min-w-[220px]`}>
                    Sub-Kategori
                  </th>
                  <th scope="col" className={`${headerCell} min-w-[240px]`}>
                    Item
                  </th>
                  <th scope="col" className={`${headerCell} min-w-[190px]`}>
                    PIC
                  </th>
                  <th scope="col" className={`${headerCell} min-w-[170px]`}>
                    Evidence
                  </th>
                  <th scope="col" className={`${headerCell} w-[130px]`}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {groupedRows.map((group) => (
                  <Fragment key={group.code}>
                    <tr>
                      <th
                        scope="colgroup"
                        colSpan={SUMMARY_COLUMN_COUNT}
                        className={disiplinHeaderCell}
                      >
                        {group.label}
                      </th>
                    </tr>
                    {group.empty ? (
                      <tr className="bg-white">
                        <td
                          colSpan={SUMMARY_COLUMN_COUNT}
                          className="border-b border-outline/50 px-4 py-3 text-xs italic text-primary/45"
                        >
                          Belum ada sub-kategori
                        </td>
                      </tr>
                    ) : (
                      group.subKategori.map((sub) =>
                        sub.rows.map((row, index) => {
                          const key = `${sub.key}-${row.item?.id ?? "none"}-${index}`;
                          return (
                            <tr
                              key={key}
                              className="bg-white transition-colors hover:bg-background/60"
                            >
                              {index === 0 ? (
                                <td
                                  rowSpan={sub.rows.length}
                                  className="border-b border-outline/50 px-3 py-3 align-top text-xs text-primary/80"
                                >
                                  <span className="block font-mono text-[11px] font-semibold text-primary/60">
                                    {sub.sub_kategori?.kode}
                                  </span>
                                  <span className="block font-semibold text-primary/85">
                                    {sub.sub_kategori?.nama}
                                  </span>
                                </td>
                              ) : null}
                              <td className={bodyCell}>
                                {row.item ? (
                                  <>
                                    <span className="block font-mono text-[11px] font-semibold text-primary/60">
                                      {row.item.kode}
                                    </span>
                                    <span className="block text-primary/85">
                                      {row.item.nama}
                                    </span>
                                  </>
                                ) : (
                                  <span className="italic text-primary/45">
                                    Belum ada item
                                  </span>
                                )}
                              </td>
                              <td className={bodyCell}>
                                {row.pics.length === 0 ? (
                                  <span className="text-primary/40">—</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {row.pics.map((pic) => (
                                      <span
                                        key={pic.user_id}
                                        className="rounded-full bg-background px-2 py-1 text-[11px] font-semibold text-primary/70"
                                      >
                                        {pic.name}
                                        {pic.status !== "active" ? (
                                          <span className="ml-1 font-medium text-primary/40">
                                            (non-aktif)
                                          </span>
                                        ) : null}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className={bodyCell}>
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
                              <td className={bodyCell}>
                                <span
                                  className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${summaryStatusClass(
                                    row.status,
                                  )}`}
                                >
                                  {summaryStatusLabel(row.status)}
                                </span>
                              </td>
                            </tr>
                          );
                        }),
                      )
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
