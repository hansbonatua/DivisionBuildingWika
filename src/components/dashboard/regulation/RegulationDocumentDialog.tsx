"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import RegulationDialogShell from "@/components/dashboard/regulation/RegulationDialogShell";
import RegulationFileField from "@/components/dashboard/regulation/RegulationFileField";
import {
  cleanupRegulationOrphan,
  readRegulationApiError,
  uploadRegulationFile,
} from "@/components/dashboard/regulation/regulation-ui";
import type {
  RegulationDocumentDto,
  RegulationSubKategoriDto,
} from "@/lib/regulation/service";
import {
  REGULATION_MAX_FILE_SIZE_BYTES,
  isRegulationAllowedFileName,
} from "@/lib/regulation/storage";

// Create/edit form for one Regulation document.
//
// The browser uploads bytes directly to Private Blob after asking for a token,
// then submits only metadata. If the metadata save fails after the upload, the
// new blob is handed to the orphan-cleanup endpoint. Editing without a new file
// only changes metadata and leaves the stored document untouched.

const inputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";
const textareaClass =
  "w-full rounded-lg border border-outline/60 bg-white px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";

const KODE_MAX = 30;
const NAMA_MAX = 200;
const NOTE_MAX = 2000;

type Phase = "idle" | "uploading" | "saving";

function snapshotOf(kode: string, nama: string, note: string): string {
  return JSON.stringify({ kode, nama, note });
}

export default function RegulationDocumentDialog({
  parent,
  record,
  disiplinName,
  onClose,
  onSaved,
}: {
  parent: RegulationSubKategoriDto;
  record?: RegulationDocumentDto;
  disiplinName: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const formId = useId();
  const titleId = `${formId}-title`;
  const kodeId = `${formId}-kode`;
  const namaId = `${formId}-nama`;
  const noteId = `${formId}-note`;
  const fileId = `${formId}-file`;

  const [kode, setKode] = useState(record?.kode ?? "");
  const [nama, setNama] = useState(record?.nama ?? "");
  const [note, setNote] = useState(record?.note ?? "");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [filePickerOpen, setFilePickerOpen] = useState(record === undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [uploadPercent, setUploadPercent] = useState(0);
  const busyRef = useRef(false);
  const [initialSnapshot] = useState(() =>
    snapshotOf(record?.kode ?? "", record?.nama ?? "", record?.note ?? ""),
  );

  const editing = record !== undefined;
  const busy = phase !== "idle";
  const dirty = pendingFile !== null || snapshotOf(kode, nama, note) !== initialSnapshot;
  const existingFile: { name: string; size: number } | null = record
    ? { name: record.file_name, size: record.file_size_bytes }
    : null;

  const requestClose = useCallback(() => {
    if (busyRef.current) return;
    if (dirty && !window.confirm("Perubahan belum disimpan. Tutup form?")) {
      return;
    }
    onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    if (!dirty) return;
    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  function handleFileSelection(file: File | null): void {
    if (!file) return;
    if (!isRegulationAllowedFileName(file.name)) {
      setFormError("Format file harus PDF, DOC/DOCX, XLS/XLSX, atau ZIP.");
      return;
    }
    if (file.name.trim().length > 255) {
      setFormError("Nama file maksimal 255 karakter.");
      return;
    }
    if (file.size <= 0 || file.size > REGULATION_MAX_FILE_SIZE_BYTES) {
      setFormError("Ukuran file harus lebih dari 0 dan maksimal 20 MB.");
      return;
    }
    setFormError(null);
    setPendingFile(file);
    setFilePickerOpen(false);
  }

  function handleRemovePending(): void {
    if (busyRef.current) return;
    setPendingFile(null);
    setFilePickerOpen(record === undefined);
    setFormError(null);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (busyRef.current) return;

    const trimmedKode = kode.trim();
    const trimmedNama = nama.trim();
    const trimmedNote = note.trim();

    if (trimmedKode.length === 0) {
      setFormError("Kode dokumen wajib diisi.");
      return;
    }
    if (trimmedKode.length > KODE_MAX) {
      setFormError(`Kode dokumen maksimal ${KODE_MAX} karakter.`);
      return;
    }
    if (trimmedNama.length === 0) {
      setFormError("Judul dokumen wajib diisi.");
      return;
    }
    if (trimmedNama.length > NAMA_MAX) {
      setFormError(`Judul dokumen maksimal ${NAMA_MAX} karakter.`);
      return;
    }
    if (trimmedNote.length > NOTE_MAX) {
      setFormError(
        `Catatan maksimal ${NOTE_MAX.toLocaleString("id-ID")} karakter.`,
      );
      return;
    }
    if (!editing && !pendingFile) {
      setFormError("Pilih file dokumen yang akan diunggah.");
      return;
    }

    setFormError(null);
    busyRef.current = true;

    let uploadedPathname: string | null = null;
    if (pendingFile) {
      setPhase("uploading");
      setUploadPercent(0);
      try {
        uploadedPathname = await uploadRegulationFile(
          pendingFile,
          setUploadPercent,
        );
      } catch {
        busyRef.current = false;
        setPhase("idle");
        setUploadPercent(0);
        setFormError(
          "Gagal mengunggah file. Periksa koneksi dan konfigurasi penyimpanan lalu coba lagi.",
        );
        return;
      }
    }

    setPhase("saving");
    try {
      const endpoint = editing
        ? `/api/regulation/document/${record.id}`
        : `/api/regulation/sub-kategori/${parent.id}/document`;
      const payload: Record<string, unknown> = {
        kode: trimmedKode,
        nama: trimmedNama,
        note: trimmedNote,
      };
      if (uploadedPathname && pendingFile) {
        payload.file_name = pendingFile.name;
        payload.blob_pathname = uploadedPathname;
      }

      const response = await fetch(endpoint, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const message = await readRegulationApiError(
          response,
          editing
            ? "Gagal menyimpan perubahan dokumen."
            : "Gagal menambahkan dokumen.",
        );
        if (uploadedPathname) {
          await cleanupRegulationOrphan(uploadedPathname);
          setFormError(
            `File berhasil diunggah, tetapi data gagal disimpan. ${message}`,
          );
        } else {
          setFormError(message);
        }
        return;
      }

      onSaved(
        editing
          ? "Dokumen berhasil disimpan."
          : "Dokumen berhasil ditambahkan.",
      );
    } catch {
      if (uploadedPathname) {
        await cleanupRegulationOrphan(uploadedPathname);
        setFormError(
          "File berhasil diunggah, tetapi data gagal disimpan. Periksa koneksi lalu coba lagi.",
        );
      } else {
        setFormError(
          editing
            ? "Gagal menyimpan perubahan dokumen. Periksa koneksi lalu coba lagi."
            : "Gagal menambahkan dokumen. Periksa koneksi lalu coba lagi.",
        );
      }
    } finally {
      busyRef.current = false;
      setPhase("idle");
      setUploadPercent(0);
    }
  }

  const submitLabel =
    phase === "uploading"
      ? "Mengunggah..."
      : phase === "saving"
        ? "Memverifikasi..."
        : editing
          ? pendingFile
            ? "Upload & Simpan Perubahan"
            : "Simpan Perubahan"
          : "Upload & Simpan";
  const submitDisabled = busy || (!editing && pendingFile === null);

  return (
    <RegulationDialogShell
      titleId={titleId}
      eyebrow={`Standard & Regulation · ${disiplinName}`}
      title={editing ? "Edit Dokumen" : "Tambah Dokumen"}
      description={
        editing
          ? "Ubah metadata atau ganti file dokumen. File lama tetap tersimpan jika penyimpanan gagal."
          : `Tambahkan dokumen ke ${parent.kode} — ${parent.nama}.`
      }
      busy={busy}
      maxWidthClass="max-w-2xl"
      onClose={requestClose}
    >
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <div>
            <span className={labelClass}>Sub-Kategori</span>
            <div className="flex min-h-10 items-center rounded-lg border border-outline/60 bg-slate-50 px-3.5 py-2 text-xs font-bold text-primary/70">
              <span className="font-mono">{parent.kode}</span>
              <span className="mx-2 text-primary/30">·</span>
              <span>{parent.nama}</span>
            </div>
            <p className="mt-1 text-[11px] text-primary/45">
              Sub-kategori induk mengikuti baris tabel dan tidak dapat diubah.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[170px_1fr]">
            <div>
              <label htmlFor={kodeId} className={labelClass}>
                Kode Dokumen <span className="text-red-700">*</span>
              </label>
              <input
                id={kodeId}
                type="text"
                value={kode}
                maxLength={KODE_MAX}
                disabled={busy}
                data-autofocus="true"
                onChange={(event) => setKode(event.target.value)}
                placeholder="cth. PW.01.01"
                className={`${inputClass} font-mono uppercase`}
              />
            </div>
            <div>
              <label htmlFor={namaId} className={labelClass}>
                Judul Dokumen <span className="text-red-700">*</span>
              </label>
              <input
                id={namaId}
                type="text"
                value={nama}
                maxLength={NAMA_MAX}
                disabled={busy}
                onChange={(event) => setNama(event.target.value)}
                placeholder="cth. Panduan Perencanaan"
                className={inputClass}
              />
            </div>
          </div>

          <RegulationFileField
            inputId={fileId}
            pendingFile={pendingFile}
            existingFile={existingFile}
            filePickerOpen={filePickerOpen}
            disabled={busy}
            onSelect={handleFileSelection}
            onRemovePending={handleRemovePending}
            onOpenPicker={() => {
              setFilePickerOpen(true);
              setFormError(null);
            }}
            onCancelPicker={() => setFilePickerOpen(false)}
          />

          <div>
            <label htmlFor={noteId} className={labelClass}>
              Catatan
            </label>
            <textarea
              id={noteId}
              rows={3}
              value={note}
              maxLength={NOTE_MAX}
              disabled={busy}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Catatan tambahan mengenai dokumen..."
              className={`${textareaClass} min-h-20 resize-y`}
            />
            <p className="mt-1 text-[11px] text-primary/45">
              {note.trim().length.toLocaleString("id-ID")} /{" "}
              {NOTE_MAX.toLocaleString("id-ID")} karakter
            </p>
          </div>

          {phase === "uploading" ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl border border-outline bg-background/60 px-3.5 py-3"
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-primary/70">
                <span>Mengunggah file...</span>
                <span className="tabular-nums">{uploadPercent}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="Progres unggah file"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={uploadPercent}
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
              >
                <div
                  className="h-full rounded-full bg-secondary transition-all duration-200"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>
            </div>
          ) : phase === "saving" ? (
            <p
              role="status"
              aria-live="polite"
              className="rounded-lg border border-outline bg-background/60 px-3.5 py-2.5 text-xs font-semibold text-primary/70"
            >
              Memverifikasi file dan menyimpan data...
            </p>
          ) : null}

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
            disabled={busy}
            className="rounded-lg border border-outline bg-white px-4 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitDisabled}
            className="rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </RegulationDialogShell>
  );
}
