"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  KNOWLEDGE_TYPE_LABELS,
  type KnowledgeType,
} from "@/lib/knowledge-management/schema";
import KnowledgeDeleteDialog from "@/components/dashboard/knowledge-management/KnowledgeDeleteDialog";
import KnowledgeProjectCombobox from "@/components/dashboard/knowledge-management/KnowledgeProjectCombobox";
import {
  EMPTY_VALUE,
  KNOWLEDGE_CONTENT_MAX,
  KNOWLEDGE_EVIDENCE_NAME_MAX,
  KNOWLEDGE_EVIDENCE_URL_MAX,
  formatKnowledgeDate,
  isKnowledgeUrl,
  knowledgeLengthState,
  type KnowledgePicOptionDto,
  type KnowledgeProjectOptionDto,
  type KnowledgeRecordDto,
} from "@/components/dashboard/knowledge-management/types";

const inputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";
const textareaClass =
  "w-full rounded-lg border border-outline/60 bg-white px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";

type ApiErrorBody = {
  error?: {
    message?: string;
    details?: Record<string, string[] | undefined>;
  };
};

function firstValidationDetail(
  details: Record<string, string[] | undefined> | undefined,
): string | null {
  if (!details) return null;
  for (const messages of Object.values(details)) {
    const message = messages?.find((value) => value.trim() !== "");
    if (message) return message;
  }
  return null;
}

async function readApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    const detail = firstValidationDetail(body.error?.details);
    if (detail) return detail;
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
    return "Anda tidak memiliki akses untuk mengubah Knowledge Management.";
  }
  return fallback;
}

function snapshotOf(
  projectId: string | null,
  content: string,
  picIds: string[],
  evidenceName: string,
  evidenceUrl: string,
): string {
  return JSON.stringify({
    projectId,
    content,
    picIds: [...picIds].sort(),
    evidenceName,
    evidenceUrl,
  });
}

function mergePicOptions(
  current: KnowledgePicOptionDto[],
  incoming: KnowledgePicOptionDto[],
): KnowledgePicOptionDto[] {
  const byId = new Map(current.map((option) => [option.user_id, option]));
  for (const option of incoming) {
    byId.set(option.user_id, option);
  }
  return [...byId.values()];
}

function counterClass(length: number, max: number): string {
  const state = knowledgeLengthState(length, max);
  if (state === "over") return "text-red-700";
  if (state === "warning") return "text-amber-700";
  return "text-primary/50";
}

function FieldCounter({
  id,
  value,
  max,
}: {
  id: string;
  value: number;
  max: number;
}) {
  return (
    <p
      id={id}
      aria-live="polite"
      className={`mt-1 text-[11px] font-medium ${counterClass(value, max)}`}
    >
      {value.toLocaleString("id-ID")} / {max.toLocaleString("id-ID")} karakter
      {value > max ? " — melebihi batas" : ""}
    </p>
  );
}

export default function KnowledgeFormDialog({
  mode,
  knowledgeType,
  record,
  onClose,
  onSaved,
  onDeleted,
}: {
  mode: "create" | "edit";
  knowledgeType: KnowledgeType;
  record?: KnowledgeRecordDto;
  onClose: () => void;
  onSaved: (record: KnowledgeRecordDto) => void;
  onDeleted: () => void;
}) {
  const formId = useId();
  const titleId = `${formId}-title`;
  const contentId = `${formId}-content`;
  const contentCounterId = `${formId}-content-counter`;
  const evidenceNameId = `${formId}-evidence-name`;
  const evidenceNameCounterId = `${formId}-evidence-name-counter`;
  const evidenceUrlId = `${formId}-evidence-url`;
  const evidenceUrlCounterId = `${formId}-evidence-url-counter`;
  const picSearchId = `${formId}-pic-search`;

  const [currentRecord, setCurrentRecord] = useState<KnowledgeRecordDto | null>(
    record ?? null,
  );
  const [project, setProject] = useState<KnowledgeProjectOptionDto | null>(
    record
      ? {
          project_id: record.project.project_id,
          name: record.project.name,
          location: record.project.location,
          year: record.project.year,
        }
      : null,
  );
  const [content, setContent] = useState(record?.content ?? "");
  const [picIds, setPicIds] = useState<string[]>(
    record?.pics.map((pic) => pic.user_id) ?? [],
  );
  const [evidenceName, setEvidenceName] = useState(record?.evidence.name ?? "");
  const [evidenceUrl, setEvidenceUrl] = useState(record?.evidence.url ?? "");
  const [picOptions, setPicOptions] = useState<KnowledgePicOptionDto[]>(
    record
      ? record.pics.map((pic) => ({
          user_id: pic.user_id,
          name: pic.name,
          status: pic.status,
          position: "",
        }))
      : [],
  );
  const [picSearch, setPicSearch] = useState("");
  const [picLoading, setPicLoading] = useState(true);
  const [picError, setPicError] = useState<string | null>(null);
  const [picReloadToken, setPicReloadToken] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reloadingLatest, setReloadingLatest] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [initialSnapshot, setInitialSnapshot] = useState(() =>
    snapshotOf(
      record?.project.project_id ?? null,
      record?.content ?? "",
      record?.pics.map((pic) => pic.user_id) ?? [],
      record?.evidence.name ?? "",
      record?.evidence.url ?? "",
    ),
  );

  const dialogRef = useRef<HTMLDivElement>(null);
  const submitLabel =
    mode === "create" ? "Simpan" : "Simpan Perubahan";
  const label = KNOWLEDGE_TYPE_LABELS[knowledgeType];

  const currentSnapshot = snapshotOf(
    project?.project_id ?? null,
    content,
    picIds,
    evidenceName,
    evidenceUrl,
  );
  const dirty = currentSnapshot !== initialSnapshot;
  const contentOver = content.length > KNOWLEDGE_CONTENT_MAX;
  const nameOver = evidenceName.length > KNOWLEDGE_EVIDENCE_NAME_MAX;
  const urlOver = evidenceUrl.length > KNOWLEDGE_EVIDENCE_URL_MAX;
  const submitDisabled = submitting || contentOver || nameOver || urlOver;

  const filteredPicOptions = useMemo(() => {
    const term = picSearch.trim().toLowerCase();
    if (term === "") return picOptions;
    return picOptions.filter((option) => option.name.toLowerCase().includes(term));
  }, [picOptions, picSearch]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadPicOptions(): Promise<void> {
      setPicLoading(true);
      setPicError(null);
      try {
        const response = await fetch("/api/knowledge-management/pic-options", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.status === 401 || response.status === 403) {
          if (active) {
            setPicError("Anda tidak memiliki akses ke daftar PIC.");
          }
          return;
        }
        if (!response.ok) throw new Error("LOAD_FAILED");
        const body = (await response.json()) as { data?: unknown };
        if (!Array.isArray(body.data)) throw new Error("INVALID_RESPONSE");
        const incoming: KnowledgePicOptionDto[] = [];
        for (const item of body.data) {
          if (typeof item !== "object" || item === null) continue;
          const candidate = item as Partial<KnowledgePicOptionDto>;
          if (
            typeof candidate.user_id === "string" &&
            typeof candidate.name === "string" &&
            typeof candidate.status === "string"
          ) {
            incoming.push({
              user_id: candidate.user_id,
              name: candidate.name,
              status: candidate.status,
              position: typeof candidate.position === "string" ? candidate.position : "",
            });
          }
        }
        if (active) {
          setPicOptions((current) => mergePicOptions(current, incoming));
        }
      } catch {
        if (!active || controller.signal.aborted) return;
        setPicError("Gagal memuat daftar PIC.");
      } finally {
        if (active) setPicLoading(false);
      }
    }

    void loadPicOptions();
    return () => {
      active = false;
      controller.abort();
    };
  }, [picReloadToken]);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const target =
      dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]") ??
      dialogRef.current?.querySelector<HTMLElement>("button, input, textarea, select");
    target?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const requestClose = useCallback(() => {
    if (submitting) return;
    if (dirty && !window.confirm("Perubahan belum disimpan. Tutup form?")) {
      return;
    }
    onClose();
  }, [dirty, onClose, submitting]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !deleteOpen) {
        event.preventDefault();
        requestClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [deleteOpen, requestClose]);

  function handleTab(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function togglePic(userId: string): void {
    setPicIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  async function reloadLatest(): Promise<void> {
    if (!currentRecord || reloadingLatest) return;
    setReloadingLatest(true);
    setFormError(null);
    try {
      const response = await fetch(`/api/knowledge-management/${currentRecord.id}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setFormError(
          await readApiErrorMessage(response, "Gagal memuat data terbaru."),
        );
        return;
      }
      const body = (await response.json()) as { data?: KnowledgeRecordDto };
      if (!body.data) {
        setFormError("Respons server tidak valid.");
        return;
      }
      const latest = body.data;
      const latestPicIds = latest.pics.map((pic) => pic.user_id);
      setCurrentRecord(latest);
      setProject({
        project_id: latest.project.project_id,
        name: latest.project.name,
        location: latest.project.location,
        year: latest.project.year,
      });
      setContent(latest.content);
      setPicIds(latestPicIds);
      setPicOptions((current) =>
        mergePicOptions(
          current,
          latest.pics.map((pic) => ({
            user_id: pic.user_id,
            name: pic.name,
            status: pic.status,
            position: "",
          })),
        ),
      );
      setEvidenceName(latest.evidence.name);
      setEvidenceUrl(latest.evidence.url);
      setPicSearch("");
      setInitialSnapshot(
        snapshotOf(
          latest.project.project_id,
          latest.content,
          latestPicIds,
          latest.evidence.name,
          latest.evidence.url,
        ),
      );
      setConflict(false);
    } catch {
      setFormError("Gagal memuat data terbaru. Periksa koneksi lalu coba lagi.");
    } finally {
      setReloadingLatest(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) return;

    const trimmedContent = content.trim();
    const trimmedName = evidenceName.trim();
    const trimmedUrl = evidenceUrl.trim();

    if (mode === "create" && !project) {
      setFormError("Pilih Master Project terlebih dahulu.");
      return;
    }
    if (trimmedContent.length === 0) {
      setFormError("Isi knowledge wajib diisi.");
      return;
    }
    if (trimmedContent.length > KNOWLEDGE_CONTENT_MAX) {
      setFormError(`Isi knowledge maksimal ${KNOWLEDGE_CONTENT_MAX.toLocaleString("id-ID")} karakter.`);
      return;
    }
    if (picIds.length === 0) {
      setFormError("Pilih minimal 1 PIC.");
      return;
    }
    if (trimmedName.length === 0) {
      setFormError("Nama evidence wajib diisi.");
      return;
    }
    if (trimmedName.length > KNOWLEDGE_EVIDENCE_NAME_MAX) {
      setFormError(
        `Nama evidence maksimal ${KNOWLEDGE_EVIDENCE_NAME_MAX.toLocaleString("id-ID")} karakter.`,
      );
      return;
    }
    if (trimmedUrl.length === 0) {
      setFormError("URL evidence wajib diisi.");
      return;
    }
    if (trimmedUrl.length > KNOWLEDGE_EVIDENCE_URL_MAX) {
      setFormError(
        `URL evidence maksimal ${KNOWLEDGE_EVIDENCE_URL_MAX.toLocaleString("id-ID")} karakter.`,
      );
      return;
    }
    if (!isKnowledgeUrl(trimmedUrl)) {
      setFormError("URL evidence harus diawali http:// atau https://.");
      return;
    }
    if (mode === "edit" && !currentRecord) {
      setFormError("Data Knowledge Management tidak ditemukan.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setConflict(false);
    try {
      const endpoint =
        mode === "create"
          ? `/api/knowledge-management?type=${encodeURIComponent(knowledgeType)}`
          : `/api/knowledge-management/${currentRecord?.id}`;
      const payload =
        mode === "create"
          ? {
              project_id: project?.project_id,
              content: trimmedContent,
              pic_ids: picIds,
              evidence_name: trimmedName,
              evidence_url: trimmedUrl,
            }
          : {
              content: trimmedContent,
              pic_ids: picIds,
              evidence_name: trimmedName,
              evidence_url: trimmedUrl,
              expected_version: currentRecord?.version,
            };
      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        if (response.status === 409) setConflict(true);
        setFormError(
          await readApiErrorMessage(
            response,
            mode === "create"
              ? "Gagal menambahkan Knowledge Management."
              : "Gagal menyimpan perubahan Knowledge Management.",
          ),
        );
        return;
      }
      const body = (await response.json()) as { data?: KnowledgeRecordDto };
      if (!body.data) {
        setFormError("Respons server tidak valid.");
        return;
      }
      onSaved(body.data);
    } catch {
      setFormError(
        mode === "create"
          ? "Gagal menambahkan Knowledge Management. Periksa koneksi lalu coba lagi."
          : "Gagal menyimpan perubahan Knowledge Management. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const projectReadOnly = currentRecord?.project ?? null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) requestClose();
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onKeyDown={handleTab}
          className="flex max-h-[100dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-2xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-outline bg-background/60 px-5 py-4 sm:px-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">
                {label}
              </p>
              <h2 id={titleId} className="mt-0.5 text-lg font-bold text-primary">
                {mode === "create" ? `Tambah ${label}` : `Edit ${label}`}
              </h2>
              <p className="mt-0.5 text-xs text-primary/55">
                {mode === "create"
                  ? "Lengkapi content, PIC, dan satu evidence."
                  : "Perubahan diterapkan ke content, PIC, dan evidence sekaligus."}
              </p>
            </div>
            <button
              type="button"
              onClick={requestClose}
              disabled={submitting}
              aria-label="Tutup form"
              className="rounded-lg p-2 text-primary/50 transition-colors hover:bg-white hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                width="18"
                height="18"
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

          <form
            noValidate
            onSubmit={(event) => void handleSubmit(event)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className={labelClass}>
                    Master Project <span className="text-red-700">*</span>
                  </span>
                  {mode === "create" ? (
                    <KnowledgeProjectCombobox
                      mode="remote"
                      value={project}
                      onChange={setProject}
                      disabled={submitting}
                      autoFocus
                    />
                  ) : (
                    <div className="rounded-lg border border-outline/60 bg-slate-50 px-3.5 py-2.5">
                      <p className="text-xs font-bold text-primary">
                        {projectReadOnly?.name ?? EMPTY_VALUE}
                      </p>
                      <p className="mt-0.5 text-[11px] text-primary/50">
                        {projectReadOnly
                          ? `${projectReadOnly.location} · ${projectReadOnly.year}`
                          : EMPTY_VALUE}
                      </p>
                      <p className="mt-1 text-[11px] text-primary/40">
                        Master Project tidak dapat diubah saat edit.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <span className={labelClass}>Kategori</span>
                  <div className="flex h-10 items-center rounded-lg border border-outline/60 bg-slate-50 px-3.5 text-xs font-bold text-primary/70">
                    {label}
                  </div>
                  <p className="mt-1 text-[11px] text-primary/45">
                    Kategori mengikuti halaman dan tidak dapat diubah.
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor={contentId} className={labelClass}>
                  Isi Knowledge <span className="text-red-700">*</span>
                </label>
                <textarea
                  id={contentId}
                  rows={8}
                  value={content}
                  disabled={submitting}
                  data-autofocus={mode === "edit" ? "true" : undefined}
                  aria-invalid={contentOver ? true : undefined}
                  aria-describedby={contentCounterId}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Tulis ringkasan, poin, atau langkah..."
                  className={`${textareaClass} min-h-40 resize-y`}
                />
                <FieldCounter
                  id={contentCounterId}
                  value={content.length}
                  max={KNOWLEDGE_CONTENT_MAX}
                />
              </div>

              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor={picSearchId} className="text-xs font-semibold text-slate-700">
                    PIC <span className="text-red-700">*</span>
                  </label>
                  <span
                    className={`text-[11px] font-semibold ${
                      picIds.length === 0 ? "text-amber-700" : "text-primary/50"
                    }`}
                  >
                    {picIds.length} dipilih
                  </span>
                </div>
                <input
                  id={picSearchId}
                  type="search"
                  value={picSearch}
                  disabled={submitting}
                  onChange={(event) => setPicSearch(event.target.value)}
                  placeholder="Cari nama PIC..."
                  className={`${inputClass} mb-2`}
                />
                <div className="max-h-48 overflow-y-auto rounded-lg border border-outline/60 bg-white p-2">
                  {picLoading && picOptions.length === 0 ? (
                    <p className="px-1 py-2 text-[11px] text-primary/50">Memuat opsi PIC...</p>
                  ) : picError ? (
                    <div className="flex flex-wrap items-center gap-2 px-1 py-2">
                      <p role="alert" className="text-[11px] font-semibold text-red-700">
                        {picError}
                      </p>
                      <button
                        type="button"
                        onClick={() => setPicReloadToken((value) => value + 1)}
                        className="rounded border border-red-300 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  ) : filteredPicOptions.length === 0 ? (
                    <p className="px-1 py-2 text-[11px] text-primary/50">
                      {picOptions.length === 0
                        ? "Belum ada PIC Head Office."
                        : "Tidak ada PIC yang cocok dengan pencarian."}
                    </p>
                  ) : (
                    filteredPicOptions.map((option) => (
                      <label
                        key={option.user_id}
                        className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1.5 text-[11px] font-medium text-primary/80 hover:bg-background"
                      >
                        <input
                          type="checkbox"
                          checked={picIds.includes(option.user_id)}
                          disabled={submitting}
                          onChange={() => togglePic(option.user_id)}
                          className="mt-0.5"
                        />
                        <span>
                          {option.name}
                          {option.status !== "active" ? (
                            <span className="ml-1 text-primary/40">(non-aktif)</span>
                          ) : null}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <p className="mt-1 text-[11px] text-primary/45">
                  Hanya user Head Office. Status suspended tetap dapat dipilih.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={evidenceNameId} className={labelClass}>
                    Nama Evidence <span className="text-red-700">*</span>
                  </label>
                  <input
                    id={evidenceNameId}
                    type="text"
                    value={evidenceName}
                    disabled={submitting}
                    aria-invalid={nameOver ? true : undefined}
                    aria-describedby={evidenceNameCounterId}
                    onChange={(event) => setEvidenceName(event.target.value)}
                    placeholder="cth. Laporan evaluasi proyek"
                    className={inputClass}
                  />
                  <FieldCounter
                    id={evidenceNameCounterId}
                    value={evidenceName.length}
                    max={KNOWLEDGE_EVIDENCE_NAME_MAX}
                  />
                </div>

                <div>
                  <label htmlFor={evidenceUrlId} className={labelClass}>
                    URL Evidence <span className="text-red-700">*</span>
                  </label>
                  <input
                    id={evidenceUrlId}
                    type="url"
                    value={evidenceUrl}
                    disabled={submitting}
                    aria-invalid={urlOver ? true : undefined}
                    aria-describedby={`${evidenceUrlCounterId} ${formId}-evidence-url-help`}
                    onChange={(event) => setEvidenceUrl(event.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                  />
                  <FieldCounter
                    id={evidenceUrlCounterId}
                    value={evidenceUrl.length}
                    max={KNOWLEDGE_EVIDENCE_URL_MAX}
                  />
                  <p id={`${formId}-evidence-url-help`} className="mt-1 text-[11px] text-primary/45">
                    Gunakan tautan HTTP/HTTPS.
                  </p>
                </div>
              </div>

              {mode === "edit" && currentRecord ? (
                <div className="grid gap-3 rounded-xl border border-outline/60 bg-background/60 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-primary/45">
                      Created By
                    </p>
                    <p className="mt-1 text-xs font-semibold text-primary">
                      {currentRecord.created_by.name}
                    </p>
                    <p className="text-[11px] text-primary/50">
                      {formatKnowledgeDate(currentRecord.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-primary/45">
                      Updated By
                    </p>
                    <p className="mt-1 text-xs font-semibold text-primary">
                      {currentRecord.updated_by?.name ?? EMPTY_VALUE}
                    </p>
                    <p className="text-[11px] text-primary/50">
                      {formatKnowledgeDate(currentRecord.updated_at)}
                    </p>
                  </div>
                </div>
              ) : null}

              {mode === "edit" && currentRecord ? (
                <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
                  <p className="text-xs font-bold text-red-800">Hapus record</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-red-700/80">
                    Record, seluruh PIC, dan evidence akan dihapus permanen. Master Project
                    tidak ikut dihapus.
                  </p>
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    disabled={submitting || reloadingLatest}
                    className="mt-3 rounded-lg border border-red-300 bg-white px-3.5 py-2 text-[11px] font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Hapus record
                  </button>
                </div>
              ) : null}

              {formError ? (
                <div
                  role="alert"
                  className={`rounded-lg border px-3.5 py-2.5 text-xs font-semibold ${
                    conflict
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-red-300 bg-red-50 text-red-700"
                  }`}
                >
                  <p>{formError}</p>
                  {conflict ? (
                    <button
                      type="button"
                      onClick={() => void reloadLatest()}
                      disabled={reloadingLatest}
                      className="mt-2 rounded border border-amber-400 bg-white px-3 py-1.5 text-[11px] font-bold text-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {reloadingLatest ? "Memuat..." : "Muat ulang data terbaru"}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-outline bg-background/40 px-5 py-3.5 sm:px-6">
              <button
                type="button"
                onClick={requestClose}
                disabled={submitting}
                className="rounded-lg border border-outline bg-white px-4 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitDisabled}
                className="rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Menyimpan..." : submitLabel}
              </button>
            </div>
          </form>
        </div>
      </div>

      {deleteOpen && currentRecord ? (
        <KnowledgeDeleteDialog
          record={currentRecord}
          onCancel={() => setDeleteOpen(false)}
          onDeleted={onDeleted}
          onConflict={(message) => {
            setDeleteOpen(false);
            setConflict(true);
            setFormError(message);
          }}
        />
      ) : null}
    </>
  );
}
