"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PdocTable from "@/components/dashboard/project-documentation/PdocTable";
import {
  draftToUpdatePayload,
  filterPdocRows,
  pdocDraftEquals,
  setPdocWeek,
  toPdocDraft,
  validatePdocDraft,
  type PdocEditingState,
  type PdocRowDto,
} from "@/lib/project-documentation/pdoc-draft";

// Project Documentation page.
//
// One GET loads every Master Project for the selected period (including those
// without documentation). At most one row is in edit mode; the API response
// replaces that row, with no optimistic update and no refetch.

type Feedback = { kind: "success" | "error"; message: string };

const PDOC_MONTH_OPTIONS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
] as const;

function jakartaPeriod(): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return {
    year: Number.isInteger(year) && year >= 2000 ? year : new Date().getFullYear(),
    month:
      Number.isInteger(month) && month >= 1 && month <= 12
        ? month
        : new Date().getMonth() + 1,
  };
}

function pdocMonthLabel(month: number): string {
  return (
    PDOC_MONTH_OPTIONS.find((option) => option.value === month)?.label ??
    String(month)
  );
}

async function readApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    if (body.error?.message && body.error.message.trim() !== "") {
      return body.error.message;
    }
  } catch {
    /* non-JSON error body */
  }
  if (response.status === 401) {
    return "Sesi Anda berakhir. Silakan masuk kembali.";
  }
  if (response.status === 403) {
    return "Anda tidak memiliki akses untuk mengubah Project Documentation.";
  }
  if (response.status === 409) {
    return "Data berubah di tempat lain. Muat ulang lalu coba lagi.";
  }
  return fallback;
}

export default function ProjectDocumentationPage({
  canManage,
}: {
  canManage: boolean;
}) {
  const [rows, setRows] = useState<PdocRowDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<PdocEditingState | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // The API requires an explicit period. Default to the current Jakarta month
  // so the first load always runs and the filter is never empty on mount.
  const [selectedYear, setSelectedYear] = useState(() => jakartaPeriod().year);
  const [selectedMonth, setSelectedMonth] = useState(
    () => jakartaPeriod().month,
  );
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>([
      selectedYear,
      jakartaPeriod().year,
      ...availableYears,
    ]);
    return [...years]
      .filter((year) => Number.isInteger(year) && year >= 2000)
      .sort((left, right) => right - left);
  }, [availableYears, selectedYear]);

  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!selectedYear || !selectedMonth) return;

    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let active = true;

    async function loadRows(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/project-documentation?year=${selectedYear}&month=${selectedMonth}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as {
          data?: { rows?: PdocRowDto[]; available_years?: number[] };
        };
        if (!body.data || !Array.isArray(body.data.rows)) {
          throw new Error("INVALID_RESPONSE");
        }
        if (!active || requestId !== requestIdRef.current) return;
        setRows(body.data.rows);
        if (Array.isArray(body.data.available_years)) {
          setAvailableYears(
            body.data.available_years.filter(
              (year) => Number.isInteger(year) && year >= 2000,
            ),
          );
        }
      } catch {
        if (!active || controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        setError(
          "Gagal memuat Project Documentation. Periksa koneksi lalu coba lagi.",
        );
      } finally {
        if (active && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }

    void loadRows();
    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken, selectedYear, selectedMonth]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const filteredRows = useMemo(
    () => filterPdocRows(rows ?? [], search),
    [rows, search],
  );

  const dirty = editing !== null && !pdocDraftEquals(editing.draft, editing.initial);

  useEffect(() => {
    if (!dirty) return;
    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const confirmDiscard = useCallback(
    (label: string): boolean => {
      if (!dirty) return true;
      return window.confirm(`Perubahan belum disimpan. ${label} dan buang perubahan?`);
    },
    [dirty],
  );

  function startEdit(row: PdocRowDto): void {
    if (!canManage || busy) return;
    if (!confirmDiscard("Edit baris lain")) return;
    const initial = toPdocDraft(row);
    setEditing({
      projectId: row.project_id,
      draft: { ...initial, weeks: [...initial.weeks] },
      initial,
      error: null,
    });
    setFeedback(null);
  }

  function cancelEdit(): void {
    if (busy) return;
    if (!confirmDiscard("Batalkan edit")) return;
    setEditing(null);
  }

  function changeWeek(index: number, value: string): void {
    setEditing((previous) =>
      previous
        ? {
            ...previous,
            draft: setPdocWeek(previous.draft, index, value),
            error: null,
          }
        : previous,
    );
  }

  function changeCatatan(value: string): void {
    setEditing((previous) =>
      previous
        ? {
            ...previous,
            draft: { ...previous.draft, catatan: value },
            error: null,
          }
        : previous,
    );
  }

  async function saveEdit(): Promise<void> {
    if (!editing || busy) return;
    const validation = validatePdocDraft(editing.draft);
    if (validation) {
      setEditing({ ...editing, error: validation.message });
      return;
    }
    const payload = draftToUpdatePayload(editing.draft);
    if (!payload) {
      setEditing({ ...editing, error: "Data belum valid." });
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(
        `/api/project-documentation/${encodeURIComponent(editing.projectId)}/${selectedYear}/${selectedMonth}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const message = await readApiErrorMessage(
          response,
          "Gagal menyimpan dokumentasi.",
        );
        setEditing((previous) =>
          previous ? { ...previous, error: message } : previous,
        );
        return;
      }
      const body = (await response.json()) as { data?: PdocRowDto };
      if (!body.data) throw new Error("EMPTY_RESPONSE");
      setRows((previous) =>
        previous
          ? previous.map((row) =>
              row.project_id === body.data!.project_id ? body.data! : row,
            )
          : previous,
      );
      setEditing(null);
      setFeedback({ kind: "success", message: "Dokumentasi berhasil diperbarui." });
    } catch {
      setEditing((previous) =>
        previous
          ? {
              ...previous,
              error:
                "Gagal menyimpan dokumentasi. Periksa koneksi lalu coba lagi.",
            }
          : previous,
      );
    } finally {
      setBusy(false);
    }
  }

  function describePdfLine(): string {
    const base = `${filteredRows.length} project  |  Tahun ${selectedYear}  |  Bulan ${pdocMonthLabel(selectedMonth)}`;
    return search.trim() ? `${base}  |  Pencarian: "${search.trim()}"` : base;
  }

  async function downloadPdf(): Promise<void> {
    if (pdfBusy || filteredRows.length === 0) return;
    setPdfBusy(true);
    setPdfError(null);
    try {
      const exporter = await import(
        "@/components/dashboard/project-documentation/pdocExportPdf"
      );
      await exporter.downloadPdocPdf(filteredRows, describePdfLine());
    } catch {
      setPdfError("Gagal menyiapkan PDF. Coba lagi.");
    } finally {
      setPdfBusy(false);
    }
  }

  const totalRows = rows?.length ?? 0;
  const hasSearch = search.trim() !== "";
  const emptyMessage =
    totalRows === 0
      ? "Belum ada Master Project."
      : "Tidak ada project yang cocok dengan pencarian.";

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
            Rekap Bulanan Project Documentation
          </h1>
          <p className="mt-1 max-w-3xl text-base text-primary/70">
            Dokumentasi mingguan seluruh Master Project per periode. Isi lima link
            minggu dan catatan langsung di dalam tabel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-background px-3 py-1 text-[11px] font-semibold text-primary/60">
            {hasSearch
              ? `${filteredRows.length} dari ${totalRows} project`
              : `${totalRows} project`}
          </span>
          <button
            type="button"
            onClick={() => void downloadPdf()}
            disabled={
              loading ||
              filteredRows.length === 0 ||
              pdfBusy ||
              editing !== null ||
              busy
            }
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-outline bg-white px-3 text-[11px] font-bold text-primary/70 transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden="true">📄</span>
            <span>{pdfBusy ? "Menyiapkan..." : "Export PDF"}</span>
          </button>
        </div>
      </div>

      {feedback ? (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
            feedback.kind === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <section className="rounded-2xl border border-outline/60 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[220px_240px_1fr] lg:items-end">
          <div>
            <label
              htmlFor="pdoc-year"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Tahun Dokumentasi
            </label>
            <select
              id="pdoc-year"
              value={selectedYear}
              disabled={editing !== null || busy}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="h-10 w-full rounded-lg border border-outline/60 bg-white px-3 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="pdoc-month"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Bulan
            </label>
            <select
              id="pdoc-month"
              value={selectedMonth}
              disabled={editing !== null || busy}
              onChange={(event) => setSelectedMonth(Number(event.target.value))}
              className="h-10 w-full rounded-lg border border-outline/60 bg-white px-3 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              {PDOC_MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] font-semibold text-primary/50">
            Menampilkan periode {pdocMonthLabel(selectedMonth)} {selectedYear}.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-outline/60 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-md">
            <label
              htmlFor="pdoc-search"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Cari Nama Proyek
            </label>
            <input
              id="pdoc-search"
              type="search"
              value={search}
              disabled={loading || editing !== null || busy}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama project..."
              className="h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </div>
          <div className="flex items-center gap-2">
            {hasSearch ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                disabled={editing !== null || busy}
                className="h-10 rounded-lg border border-outline bg-white px-4 text-xs font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset
              </button>
            ) : null}
            <p className="text-[11px] font-semibold text-primary/50">
              {filteredRows.length} dari {totalRows} baris ditampilkan.
            </p>
          </div>
        </div>
        {pdfError ? (
          <p role="alert" className="mt-2 text-[11px] font-semibold text-red-700">
            {pdfError}
          </p>
        ) : null}
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

      {loading && rows === null ? (
        <div
          className="space-y-3 rounded-2xl border border-outline/60 bg-white p-6"
          aria-live="polite"
        >
          <p className="text-xs font-medium text-primary/60">
            Memuat Project Documentation...
          </p>
          <div className="h-10 animate-pulse rounded-lg bg-background" />
          <div className="h-16 animate-pulse rounded-lg bg-background" />
          <div className="h-16 animate-pulse rounded-lg bg-background" />
        </div>
      ) : rows === null ? (
        <div className="rounded-2xl border border-outline/60 bg-white p-8 text-center">
          <p className="text-sm font-bold text-primary">
            Gagal memuat Project Documentation.
          </p>
          <p className="mt-1 text-xs text-primary/60">
            Periksa koneksi lalu coba kembali.
          </p>
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      ) : (
        <PdocTable
          rows={filteredRows}
          canManage={canManage}
          editing={editing}
          busy={busy}
          emptyMessage={emptyMessage}
          onStartEdit={startEdit}
          onWeekChange={changeWeek}
          onCatatanChange={changeCatatan}
          onCancelEdit={cancelEdit}
          onSaveEdit={() => void saveEdit()}
        />
      )}
    </div>
  );
}
