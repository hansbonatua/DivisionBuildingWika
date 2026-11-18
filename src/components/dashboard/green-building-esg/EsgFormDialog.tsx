"use client";

import { useCallback, useEffect, useId, useState } from "react";
import GreenBuildingEsgDialogShell from "@/components/dashboard/green-building-esg/GreenBuildingEsgDialogShell";
import GreenBuildingProjectCombobox from "@/components/dashboard/green-building-esg/GreenBuildingProjectCombobox";
import { readEsgApiError } from "@/components/dashboard/green-building-esg/api-error";
import type {
  EsgAssessment,
  GreenBuildingProjectOption,
} from "@/components/dashboard/green-building-esg/types";
import { GREEN_BUILDING_DOCUMENTATION_MAX_LENGTH } from "@/lib/green-building-esg/constants";

const inputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

function isHttpUrl(value: string): boolean {
  if (value.length === 0 || value.length > GREEN_BUILDING_DOCUMENTATION_MAX_LENGTH) {
    return false;
  }
  if (/\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Create and edit share one form. The year is never a field: it is displayed
// read-only from the selected project (create) or the saved snapshot (edit) and
// the API always derives it from master_projects.year.
export default function EsgFormDialog({
  mode,
  record,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  record?: EsgAssessment;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const formId = useId();
  const titleId = `${formId}-title`;
  const projectId = `${formId}-project`;
  const yearId = `${formId}-year`;
  const documentationId = `${formId}-documentation`;

  const [project, setProject] = useState<GreenBuildingProjectOption | null>(
    record
      ? {
          id: record.project.project_id,
          name: record.project.name,
          location: record.project.location,
          year: record.project.project_year,
        }
      : null,
  );
  const [year, setYear] = useState<number | null>(record?.year ?? null);
  const [documentationUrl, setDocumentationUrl] = useState(
    record?.documentation_url ?? "",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const editing = mode === "edit" && record !== undefined;
  const projectChanged =
    editing && record !== undefined && project?.id !== record.project.project_id;
  const dirty =
    project?.id !== (record?.project.project_id ?? null) ||
    documentationUrl !== (record?.documentation_url ?? "");

  const requestClose = useCallback(() => {
    if (submitting) return;
    if (dirty && !window.confirm("Perubahan belum disimpan. Tutup form?")) {
      return;
    }
    onClose();
  }, [dirty, onClose, submitting]);

  useEffect(() => {
    if (!dirty) return;
    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  function handleProjectChange(next: GreenBuildingProjectOption | null): void {
    setProject(next);
    // The displayed year follows the project: the server snapshots the same
    // value on write, so the form never shows a year the API will not store.
    setYear(next?.year ?? null);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (submitting) return;

    const trimmedDocumentationUrl = documentationUrl.trim();

    if (!project) {
      setFormError("Pilih Master Project terlebih dahulu.");
      return;
    }
    if (
      trimmedDocumentationUrl.length > 0 &&
      !isHttpUrl(trimmedDocumentationUrl)
    ) {
      setFormError(
        "Dokumentasi harus berupa URL http/https tanpa spasi, maksimal 2.048 karakter.",
      );
      return;
    }
    if (editing && !record) {
      setFormError("Data penilaian tidak ditemukan.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const endpoint = editing
        ? `/api/green-building-esg/esg-assessments/${record.id}`
        : "/api/green-building-esg/esg-assessments";
      const response = await fetch(endpoint, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          documentation_url:
            trimmedDocumentationUrl.length > 0
              ? trimmedDocumentationUrl
              : null,
        }),
      });
      if (!response.ok) {
        setFormError(
          await readEsgApiError(
            response,
            editing
              ? "Gagal menyimpan perubahan penilaian."
              : "Gagal menambahkan penilaian.",
          ),
        );
        return;
      }
      onSaved(
        editing
          ? "Penilaian ESG berhasil diperbarui."
          : "Penilaian ESG berhasil ditambahkan.",
      );
    } catch {
      setFormError(
        editing
          ? "Gagal menyimpan perubahan penilaian. Periksa koneksi lalu coba lagi."
          : "Gagal menambahkan penilaian. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GreenBuildingEsgDialogShell
      titleId={titleId}
      eyebrow="Database Green Building & ESG"
      title={editing ? "Edit Penilaian ESG" : "Tambah Penilaian ESG"}
      description={
        editing
          ? "Perubahan berlaku untuk proyek dan tautan dokumentasi."
          : "Pilih Master Project lalu lengkapi tautan dokumentasi."
      }
      busy={submitting}
      maxWidthClass="max-w-xl"
      onClose={requestClose}
    >
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <div>
            <label htmlFor={projectId} className={labelClass}>
              Nama Proyek <span className="text-red-700">*</span>
            </label>
            <GreenBuildingProjectCombobox
              id={projectId}
              value={project}
              onChange={handleProjectChange}
              disabled={submitting}
              invalid={formError !== null && !project}
              autoFocus
            />
            <p className="mt-1 text-[11px] text-primary/45">
              Pilih proyek dari Master Project. Tahun penilaian mengikuti tahun
              proyek.
            </p>
          </div>

          <div>
            <span className={labelClass}>Tahun</span>
            <div
              id={yearId}
              aria-live="polite"
              className="flex h-10 w-full items-center rounded-lg border border-outline/60 bg-slate-50 px-3.5 text-xs font-semibold text-primary/70"
            >
              {year !== null ? year : "Pilih proyek terlebih dahulu"}
            </div>
            <p className="mt-1 text-[11px] text-primary/45">
              Tahun diambil otomatis dari Master Project dan tidak dapat diubah.
            </p>
          </div>

          {projectChanged ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[11px] font-semibold text-amber-800">
              Tahun mengikuti proyek baru dan status 12 bulan dipertahankan.
            </p>
          ) : null}

          <div>
            <label htmlFor={documentationId} className={labelClass}>
              Link Dokumentasi
            </label>
            <input
              id={documentationId}
              type="url"
              value={documentationUrl}
              maxLength={GREEN_BUILDING_DOCUMENTATION_MAX_LENGTH}
              disabled={submitting}
              onChange={(event) => setDocumentationUrl(event.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-primary/45">
              URL saja, bukan upload file. Kosongkan jika belum tersedia.
            </p>
          </div>

          {formError ? (
            <p
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
            >
              {formError}
            </p>
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
            disabled={submitting}
            className="rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Menyimpan..."
              : editing
                ? "Simpan Perubahan"
                : "Simpan Penilaian"}
          </button>
        </div>
      </form>
    </GreenBuildingEsgDialogShell>
  );
}
