"use client";

import { useEffect, useRef, useState } from "react";
import type { MslAssessmentDto, MslYearNoteDto, MslYearRowDto, MslYearViewDto } from "./msl-api.types";
import {
  EMPTY_MSL_DRAFT,
  MSL_INPUT_HINT,
  type MslDraft,
  draftEquals,
  draftToCreatePayload,
  draftToUpdatePayload,
  isEmptyDraft,
  toMslDraft,
} from "./msl-draft";
import MslLegend from "./MslLegend";
import MslTable, { type MslEditingState } from "./MslTable";
import MslYearNote from "./MslYearNote";

// MSL Engineering page (V1 UI).
//
// All data comes from GET /api/msl — the browser never queries the database and
// never computes the default year, the score or the category: the backend
// resolves the year and the shared pure engine derives score/category. Local
// drafts are only for the inputs being typed; every saved value comes back from
// the API response.

type Feedback = { kind: "success" | "error"; message: string };

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    if (typeof body.error?.message === "string" && body.error.message.trim() !== "") {
      return body.error.message;
    }
  } catch {
    /* non-JSON error body */
  }
  if (response.status === 403) {
    return "Anda tidak memiliki akses untuk mengubah data MSL Engineering.";
  }
  if (response.status === 401) {
    return "Sesi Anda berakhir. Silakan masuk kembali.";
  }
  return fallback;
}

export default function MslEngineeringPage({ canManage }: { canManage: boolean }) {
  const [view, setView] = useState<MslYearViewDto | null>(null);
  // null = "let the backend pick the default year" (initial load / retry).
  const [requestedYear, setRequestedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [editing, setEditing] = useState<MslEditingState | null>(null);
  const [createDrafts, setCreateDrafts] = useState<Record<string, MslDraft>>({});
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaved, setNoteSaved] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const pdfMenuRef = useRef<HTMLDivElement | null>(null);

  const hasLoadedRef = useRef(false);
  // Guard against a slow earlier request overwriting a newer result.
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!pdfMenuOpen) {
      return;
    }
    function handlePointerDown(event: MouseEvent): void {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(event.target as Node)) {
        setPdfMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setPdfMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [pdfMenuOpen]);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let active = true;

    async function loadView(): Promise<void> {
      if (hasLoadedRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const url = requestedYear === null ? "/api/msl" : `/api/msl?year=${requestedYear}`;
        const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const body = (await response.json()) as { data?: MslYearViewDto };
        if (!body.data || !Array.isArray(body.data.rows) || !Array.isArray(body.data.years)) {
          throw new Error("INVALID_RESPONSE");
        }
        if (!active || requestId !== requestIdRef.current) {
          return;
        }
        setView(body.data);
        setNoteDraft(body.data.note?.note ?? "");
        setNoteSaved(body.data.note?.note ?? "");
        setEditing(null);
        setCreateDrafts({});
        setCreateErrors({});
        setFeedback(null);
        hasLoadedRef.current = true;
      } catch (loadError) {
        if (!active || controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        const message =
          loadError instanceof Error && loadError.message === "HTTP 403"
            ? "Anda tidak memiliki akses ke MSL Engineering."
            : "Gagal memuat data MSL Engineering.";
        setError(message);
      } finally {
        if (active && requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadView();

    return () => {
      active = false;
      controller.abort();
    };
  }, [requestedYear, reloadToken]);

  const selectedYear = view?.year ?? requestedYear;
  const yearOptions =
    view && view.years.length > 0 ? view.years : view ? [view.year] : [];

  const editingDirty = editing !== null && !draftEquals(editing.draft, editing.initial);
  const createDirty = Object.values(createDrafts).some((draft) => !isEmptyDraft(draft));
  const noteDirty = noteDraft !== noteSaved;
  const hasUnsavedChanges = editingDirty || createDirty || noteDirty;

  function handleYearChange(nextYear: number): void {
    if (nextYear === selectedYear) {
      return;
    }
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "Ada perubahan yang belum disimpan. Ganti tahun dan buang perubahan?",
      );
      if (!confirmed) {
        return;
      }
    }
    setEditing(null);
    setCreateDrafts({});
    setCreateErrors({});
    setFeedback(null);
    setRequestedYear(nextYear);
  }

  function applyAssessment(dto: MslAssessmentDto): void {
    setView((previous) =>
      previous
        ? {
            ...previous,
            rows: previous.rows.map((row) =>
              row.projectId === dto.projectId ? { ...row, assessment: dto } : row,
            ),
          }
        : previous,
    );
  }

  function handleStartEdit(row: MslYearRowDto): void {
    if (!canManage || !row.assessment) {
      return;
    }
    if (createDirty) {
      setFeedback({
        kind: "error",
        message:
          "Selesaikan atau kosongkan isian pada baris yang belum dinilai terlebih dahulu.",
      });
      return;
    }
    const initial = toMslDraft(row.assessment);
    setFeedback(null);
    setEditing({
      projectId: row.projectId,
      assessmentId: row.assessment.id,
      draft: { ...initial },
      initial,
      error: null,
    });
  }

  function handleEditDraftChange(patch: Partial<MslDraft>): void {
    setEditing((previous) =>
      previous ? { ...previous, draft: { ...previous.draft, ...patch }, error: null } : previous,
    );
  }

  function handleCreateDraftChange(projectId: string, patch: Partial<MslDraft>): void {
    setCreateDrafts((previous) => ({
      ...previous,
      [projectId]: { ...(previous[projectId] ?? EMPTY_MSL_DRAFT), ...patch },
    }));
    setCreateErrors((previous) => ({ ...previous, [projectId]: "" }));
  }

  async function handleSaveEdit(): Promise<void> {
    if (!editing || !canManage || busyProjectId !== null) {
      return;
    }
    const payload = draftToUpdatePayload(editing.draft);
    if (!payload) {
      setEditing({ ...editing, error: MSL_INPUT_HINT });
      return;
    }
    setBusyProjectId(editing.projectId);
    try {
      const response = await fetch(`/api/msl/assessments/${editing.assessmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const message = await readErrorMessage(response, "Gagal memperbarui penilaian.");
        setEditing((previous) => (previous ? { ...previous, error: message } : previous));
        return;
      }
      const body = (await response.json()) as { data?: MslAssessmentDto };
      if (!body.data) {
        throw new Error("EMPTY_RESPONSE");
      }
      applyAssessment(body.data);
      setEditing(null);
      setFeedback({ kind: "success", message: "Penilaian berhasil diperbarui." });
    } catch {
      setEditing((previous) =>
        previous
          ? { ...previous, error: "Gagal memperbarui penilaian. Periksa koneksi lalu coba lagi." }
          : previous,
      );
    } finally {
      setBusyProjectId(null);
    }
  }

  async function handleSaveNew(row: MslYearRowDto): Promise<void> {
    if (!canManage || busyProjectId !== null) {
      return;
    }
    const draft = createDrafts[row.projectId] ?? EMPTY_MSL_DRAFT;
    // New assessments belong to the month currently on screen. The month
    // selector itself (and switching between months) is V2.2.
    const payload = view ? draftToCreatePayload(draft, view.month) : null;
    if (!payload) {
      setCreateErrors((previous) => ({ ...previous, [row.projectId]: MSL_INPUT_HINT }));
      return;
    }
    setBusyProjectId(row.projectId);
    setCreateErrors((previous) => ({ ...previous, [row.projectId]: "" }));
    try {
      const response = await fetch("/api/msl/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: row.projectId, ...payload }),
      });
      if (!response.ok) {
        const message = await readErrorMessage(response, "Gagal menyimpan penilaian.");
        setCreateErrors((previous) => ({ ...previous, [row.projectId]: message }));
        return;
      }
      const body = (await response.json()) as { data?: MslAssessmentDto };
      if (!body.data) {
        throw new Error("EMPTY_RESPONSE");
      }
      applyAssessment(body.data);
      setCreateDrafts((previous) => {
        const next = { ...previous };
        delete next[row.projectId];
        return next;
      });
      setFeedback({ kind: "success", message: "Penilaian berhasil disimpan." });
    } catch {
      setCreateErrors((previous) => ({
        ...previous,
        [row.projectId]: "Gagal menyimpan penilaian. Periksa koneksi lalu coba lagi.",
      }));
    } finally {
      setBusyProjectId(null);
    }
  }

  async function handleDelete(row: MslYearRowDto): Promise<void> {
    if (!canManage || !row.assessment || busyProjectId !== null || editing !== null) {
      return;
    }
    const confirmed = window.confirm(
      `Hapus penilaian MSL untuk proyek "${row.name}"? Master Project tidak akan dihapus.`,
    );
    if (!confirmed) {
      return;
    }
    setBusyProjectId(row.projectId);
    try {
      const response = await fetch(`/api/msl/assessments/${row.assessment.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setFeedback({
          kind: "error",
          message: await readErrorMessage(response, "Gagal menghapus penilaian."),
        });
        return;
      }
      setView((previous) =>
        previous
          ? {
              ...previous,
              rows: previous.rows.map((item) =>
                item.projectId === row.projectId ? { ...item, assessment: null } : item,
              ),
            }
          : previous,
      );
      setCreateDrafts((previous) => {
        const next = { ...previous };
        delete next[row.projectId];
        return next;
      });
      setFeedback({ kind: "success", message: "Penilaian berhasil dihapus." });
    } catch {
      setFeedback({
        kind: "error",
        message: "Gagal menghapus penilaian. Periksa koneksi lalu coba lagi.",
      });
    } finally {
      setBusyProjectId(null);
    }
  }

  async function handleSaveNote(): Promise<void> {
    if (!canManage || !view || view.rows.length === 0 || savingNote) {
      return;
    }
    setSavingNote(true);
    try {
      const response = await fetch("/api/msl/note", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: view.year, note: noteDraft }),
      });
      if (!response.ok) {
        setFeedback({
          kind: "error",
          message: await readErrorMessage(response, "Gagal menyimpan note akhir tahun."),
        });
        return;
      }
      const body = (await response.json()) as { data?: MslYearNoteDto };
      if (!body.data) {
        throw new Error("EMPTY_RESPONSE");
      }
      setView((previous) => (previous ? { ...previous, note: body.data as MslYearNoteDto } : previous));
      setNoteDraft(body.data.note ?? "");
      setNoteSaved(body.data.note ?? "");
      setFeedback({ kind: "success", message: "Note akhir tahun berhasil disimpan." });
    } catch {
      setFeedback({
        kind: "error",
        message: "Gagal menyimpan note akhir tahun. Periksa koneksi lalu coba lagi.",
      });
    } finally {
      setSavingNote(false);
    }
  }

  async function handlePdf(action: "view" | "download"): Promise<void> {
    if (pdfBusy || !view) {
      return;
    }
    // Snapshot what is currently on screen: the selected year, its rows and the
    // SAVED annual note (never an unsaved draft). No request is made here — the
    // PDF is built entirely from data already loaded through GET /api/msl.
    const source = { year: view.year, rows: view.rows, note: noteSaved };
    setPdfBusy(true);
    setPdfMenuOpen(false);
    setFeedback(null);
    try {
      const pdfModule = await import("./mslExportPdf");
      const logoDataUrl = await pdfModule.loadWibexLogoDataUrl();
      if (action === "view") {
        pdfModule.viewMslPdf(source, logoDataUrl);
      } else {
        pdfModule.downloadMslPdf(source, logoDataUrl);
      }
    } catch {
      setFeedback({
        kind: "error",
        message:
          action === "view"
            ? "Gagal menyiapkan pratinjau PDF."
            : "Gagal mengunduh PDF MSL Engineering.",
      });
    } finally {
      setPdfBusy(false);
    }
  }

  const emptyMessage = `Belum ada Master Project untuk tahun ${selectedYear ?? ""}.`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
              Core Enterprise
            </span>
            <span className="text-xs text-primary/50">•</span>
            <span className="text-xs text-primary/50">MSL Engineering</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">MSL Engineering</h1>
          <p className="mt-1 max-w-3xl text-base text-primary/70">
            Penilaian kapabilitas engineering per proyek berdasarkan tahun.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div ref={pdfMenuRef} className="relative">
            <button
              type="button"
              disabled={pdfBusy || view === null}
              title={view === null ? "Tunggu data selesai dimuat" : "PDF"}
              aria-expanded={pdfMenuOpen}
              aria-haspopup="menu"
              aria-label="Menu PDF MSL Engineering"
              onClick={() => setPdfMenuOpen((prev) => !prev)}
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              <span>{pdfBusy ? "Menyiapkan PDF..." : "PDF"}</span>
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
                className={`transition-transform duration-200 ${pdfMenuOpen ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {pdfMenuOpen ? (
              <div
                role="menu"
                aria-label="Menu PDF MSL Engineering"
                className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-outline/60 bg-white py-2 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={pdfBusy}
                  onClick={() => void handlePdf("view")}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary disabled:opacity-60"
                >
                  <span>View PDF</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={pdfBusy}
                  onClick={() => void handlePdf("download")}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary disabled:opacity-60"
                >
                  <span>Download PDF</span>
                </button>
              </div>
            ) : null}
          </div>
          <label
            htmlFor="msl-year"
            className="text-[11px] font-bold uppercase tracking-wide text-primary/60"
          >
            Tahun
          </label>
          <select
            id="msl-year"
            value={selectedYear ?? ""}
            onChange={(event) => handleYearChange(Number(event.target.value))}
            disabled={loading || yearOptions.length === 0}
            className="h-10 rounded-lg border border-outline/60 bg-white px-3 text-xs font-bold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {yearOptions.length === 0 ? (
              <option value={selectedYear ?? ""}>{selectedYear ?? "-"}</option>
            ) : (
              yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <section className="rounded-lg border border-outline bg-surface shadow-sm">
        <div className="flex flex-col gap-3 border-b border-outline p-4 lg:flex-row lg:items-center lg:justify-between">
          <MslLegend />
          <div className="flex items-center gap-3 text-xs font-semibold text-primary/60">
            {!loading && view ? <span>{view.rows.length} proyek</span> : null}
            <span aria-live="polite" className="text-secondary">
              {refreshing ? "Memperbarui data..." : ""}
            </span>
          </div>
        </div>

        {feedback ? (
          <div
            role={feedback.kind === "error" ? "alert" : "status"}
            className={`border-b px-4 py-3 text-xs font-semibold ${
              feedback.kind === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        {error && view ? (
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

        {error && !view ? (
          <div role="alert" className="p-8 text-center">
            <p className="text-sm font-bold text-primary">{error}</p>
            <p className="mt-1 text-xs text-primary/60">Periksa koneksi lalu coba kembali.</p>
            <button
              type="button"
              onClick={() => setReloadToken((value) => value + 1)}
              className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
            >
              Coba Lagi
            </button>
          </div>
        ) : (
          <MslTable
            rows={view?.rows ?? []}
            canManage={canManage}
            initialLoading={loading && view === null}
            emptyMessage={emptyMessage}
            editing={editing}
            createDrafts={createDrafts}
            createErrors={createErrors}
            busyProjectId={busyProjectId}
            onStartEdit={handleStartEdit}
            onCancelEdit={() => setEditing(null)}
            onEditDraftChange={handleEditDraftChange}
            onCreateDraftChange={handleCreateDraftChange}
            onSaveEdit={() => void handleSaveEdit()}
            onSaveNew={(row) => void handleSaveNew(row)}
            onDelete={(row) => void handleDelete(row)}
          />
        )}
      </section>

      {view ? (
        <MslYearNote
          year={view.year}
          canManage={canManage}
          hasProjects={view.rows.length > 0}
          note={noteDraft}
          savedNote={noteSaved}
          saving={savingNote}
          onChange={(value) => setNoteDraft(value)}
          onSave={() => void handleSaveNote()}
        />
      ) : null}

      {canManage && view && view.rows.length === 0 ? (
        <p className="text-xs text-primary/60">
          Data proyek dikelola melalui menu Master Project.
        </p>
      ) : null}
    </div>
  );
}
