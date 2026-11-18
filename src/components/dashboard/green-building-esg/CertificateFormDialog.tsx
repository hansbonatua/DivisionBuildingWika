"use client";

import { useCallback, useEffect, useId, useState } from "react";
import GreenBuildingEsgDialogShell from "@/components/dashboard/green-building-esg/GreenBuildingEsgDialogShell";
import GreenBuildingProjectCombobox from "@/components/dashboard/green-building-esg/GreenBuildingProjectCombobox";
import { readGreenBuildingApiError } from "@/components/dashboard/green-building-esg/api-error";
import type {
  GreenBuildingCertificate,
  GreenBuildingProjectOption,
} from "@/components/dashboard/green-building-esg/types";
import {
  GREEN_BUILDING_DOCUMENTATION_MAX_LENGTH,
  GREEN_BUILDING_LEMBAGA,
  GREEN_BUILDING_LEVELS_BY_LEMBAGA,
  GREEN_BUILDING_STATUSES,
  type GreenBuildingLembaga,
  type GreenBuildingLevel,
  type GreenBuildingStatus,
} from "@/lib/green-building-esg/constants";

const inputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";
const selectClass = `${inputClass} appearance-none`;
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

function isLembaga(value: string): value is GreenBuildingLembaga {
  return (GREEN_BUILDING_LEMBAGA as readonly string[]).includes(value);
}

function isStatus(value: string): value is GreenBuildingStatus {
  return (GREEN_BUILDING_STATUSES as readonly string[]).includes(value);
}

function isLevelFor(
  lembaga: GreenBuildingLembaga,
  level: string,
): level is GreenBuildingLevel {
  return (
    GREEN_BUILDING_LEVELS_BY_LEMBAGA[lembaga] as readonly string[]
  ).includes(level);
}

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

function snapshotOf(values: {
  projectId: string | null;
  location: string;
  projectValue: string;
  certificateYear: string;
  lembaga: string;
  level: string;
  status: string;
  documentationUrl: string;
}): string {
  return JSON.stringify(values);
}

export default function CertificateFormDialog({
  mode,
  record,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  record?: GreenBuildingCertificate;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const formId = useId();
  const titleId = `${formId}-title`;
  const projectId = `${formId}-project`;
  const locationId = `${formId}-location`;
  const valueId = `${formId}-value`;
  const yearId = `${formId}-year`;
  const lembagaId = `${formId}-lembaga`;
  const levelId = `${formId}-level`;
  const statusId = `${formId}-status`;
  const documentationId = `${formId}-documentation`;

  const initialLembaga: GreenBuildingLembaga | "" =
    record && isLembaga(record.lembaga) ? record.lembaga : "";
  const initialLevel: GreenBuildingLevel | "" =
    record && initialLembaga && isLevelFor(initialLembaga, record.level)
      ? record.level
      : "";
  const initialStatus: GreenBuildingStatus | "" =
    record && isStatus(record.status) ? record.status : "";

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
  const [location, setLocation] = useState(record?.location ?? "");
  const [projectValue, setProjectValue] = useState(record?.project_value ?? "");
  const [certificateYear, setCertificateYear] = useState(
    record ? String(record.certificate_year) : "",
  );
  const [lembaga, setLembaga] = useState<GreenBuildingLembaga | "">(
    initialLembaga,
  );
  const [level, setLevel] = useState<GreenBuildingLevel | "">(initialLevel);
  const [status, setStatus] = useState<GreenBuildingStatus | "">(initialStatus);
  const [documentationUrl, setDocumentationUrl] = useState(
    record?.documentation_url ?? "",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [initialSnapshot] = useState(() =>
    snapshotOf({
      projectId: record?.project.project_id ?? null,
      location: record?.location ?? "",
      projectValue: record?.project_value ?? "",
      certificateYear: record ? String(record.certificate_year) : "",
      lembaga: initialLembaga,
      level: initialLevel,
      status: initialStatus,
      documentationUrl: record?.documentation_url ?? "",
    }),
  );

  const editing = mode === "edit" && record !== undefined;
  const currentSnapshot = snapshotOf({
    projectId: project?.id ?? null,
    location,
    projectValue,
    certificateYear,
    lembaga,
    level,
    status,
    documentationUrl,
  });
  const dirty = currentSnapshot !== initialSnapshot;
  const levels = lembaga ? GREEN_BUILDING_LEVELS_BY_LEMBAGA[lembaga] : [];

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
    // Prefill only when adding. On edit the saved certificate location/year are
    // user-owned data and must not be silently overwritten.
    if (next && !editing) {
      setLocation(next.location);
      setCertificateYear(String(next.year));
    }
  }

  function handleLembagaChange(
    event: React.ChangeEvent<HTMLSelectElement>,
  ): void {
    const next = event.target.value;
    setLembaga(isLembaga(next) ? next : "");
    // Dynamic level: changing lembaga always clears the old level.
    setLevel("");
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (submitting) return;

    const trimmedProjectValue = projectValue.trim();
    const trimmedLocation = location.trim();
    const trimmedDocumentationUrl = documentationUrl.trim();
    const parsedYear = Number(certificateYear);

    if (!project) {
      setFormError("Pilih Master Project terlebih dahulu.");
      return;
    }
    if (trimmedLocation.length === 0) {
      setFormError("Lokasi wajib diisi.");
      return;
    }
    if (trimmedLocation.length > 200) {
      setFormError("Lokasi maksimal 200 karakter.");
      return;
    }
    if (trimmedProjectValue.length === 0) {
      setFormError("Nilai proyek wajib diisi.");
      return;
    }
    if (trimmedProjectValue.length > 100) {
      setFormError("Nilai proyek maksimal 100 karakter.");
      return;
    }
    if (
      !Number.isInteger(parsedYear) ||
      parsedYear < 2000 ||
      parsedYear > 2100
    ) {
      setFormError("Tahun sertifikat harus bilangan bulat 2000–2100.");
      return;
    }
    if (!lembaga) {
      setFormError("Lembaga wajib dipilih.");
      return;
    }
    if (!level) {
      setFormError("Level wajib dipilih.");
      return;
    }
    if (!isLevelFor(lembaga, level)) {
      setFormError(`Level tidak cocok untuk lembaga ${lembaga}.`);
      return;
    }
    if (!status) {
      setFormError("Status wajib dipilih.");
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
      setFormError("Data sertifikat tidak ditemukan.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const endpoint = editing
        ? `/api/green-building-esg/certificates/${record.id}`
        : "/api/green-building-esg/certificates";
      const response = await fetch(endpoint, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          project_value: trimmedProjectValue,
          location: trimmedLocation,
          certificate_year: parsedYear,
          lembaga,
          level,
          status,
          documentation_url:
            trimmedDocumentationUrl.length > 0
              ? trimmedDocumentationUrl
              : null,
        }),
      });
      if (!response.ok) {
        setFormError(
          await readGreenBuildingApiError(
            response,
            editing
              ? "Gagal menyimpan perubahan sertifikat."
              : "Gagal menambahkan sertifikat.",
          ),
        );
        return;
      }
      onSaved(
        editing
          ? "Sertifikat berhasil diperbarui."
          : "Sertifikat berhasil ditambahkan.",
      );
    } catch {
      setFormError(
        editing
          ? "Gagal menyimpan perubahan sertifikat. Periksa koneksi lalu coba lagi."
          : "Gagal menambahkan sertifikat. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GreenBuildingEsgDialogShell
      titleId={titleId}
      eyebrow="Database Green Building & ESG"
      title={editing ? "Edit Sertifikat" : "Tambah Sertifikat"}
      description={
        editing
          ? "Perubahan berlaku untuk seluruh data sertifikat."
          : "Pilih Master Project lalu lengkapi data sertifikasi."
      }
      busy={submitting}
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
              Pilih proyek dari Master Project. Lokasi dan tahun proyek akan
              mengisi awal form saat menambah data.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={locationId} className={labelClass}>
                Lokasi <span className="text-red-700">*</span>
              </label>
              <input
                id={locationId}
                type="text"
                value={location}
                maxLength={200}
                disabled={submitting}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="cth. Jakarta"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={valueId} className={labelClass}>
                Nilai Proyek <span className="text-red-700">*</span>
              </label>
              <input
                id={valueId}
                type="text"
                value={projectValue}
                maxLength={100}
                disabled={submitting}
                onChange={(event) => setProjectValue(event.target.value)}
                placeholder="cth. Rp 1.250.000.000"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={yearId} className={labelClass}>
                Tahun <span className="text-red-700">*</span>
              </label>
              <input
                id={yearId}
                type="number"
                inputMode="numeric"
                min={2000}
                max={2100}
                step={1}
                value={certificateYear}
                disabled={submitting}
                onChange={(event) => setCertificateYear(event.target.value)}
                placeholder="cth. 2026"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={lembagaId} className={labelClass}>
                Lembaga <span className="text-red-700">*</span>
              </label>
              <select
                id={lembagaId}
                value={lembaga}
                disabled={submitting}
                onChange={handleLembagaChange}
                className={selectClass}
              >
                <option value="">Pilih lembaga</option>
                {GREEN_BUILDING_LEMBAGA.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={levelId} className={labelClass}>
                Level <span className="text-red-700">*</span>
              </label>
              <select
                id={levelId}
                value={level}
                disabled={submitting || !lembaga}
                onChange={(event) => {
                  const next = event.target.value;
                  setLevel(
                    lembaga && isLevelFor(lembaga, next) ? next : "",
                  );
                }}
                className={selectClass}
              >
                <option value="">
                  {lembaga ? "Pilih level" : "Pilih lembaga terlebih dahulu"}
                </option>
                {levels.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={statusId} className={labelClass}>
                Status <span className="text-red-700">*</span>
              </label>
              <select
                id={statusId}
                value={status}
                disabled={submitting}
                onChange={(event) => {
                  const next = event.target.value;
                  setStatus(isStatus(next) ? next : "");
                }}
                className={selectClass}
              >
                <option value="">Pilih status</option>
                {GREEN_BUILDING_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor={documentationId} className={labelClass}>
              Dokumentasi
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
                : "Simpan Sertifikat"}
          </button>
        </div>
      </form>
    </GreenBuildingEsgDialogShell>
  );
}
