"use client";

import { useCallback, useEffect, useId, useState } from "react";
import RegulationDialogShell from "@/components/dashboard/regulation/RegulationDialogShell";
import { readRegulationApiError } from "@/components/dashboard/regulation/regulation-ui";
import type { RegulationSubKategoriDto } from "@/lib/regulation/service";

// Create/edit form for one Regulation sub-kategori. The discipline and sort
// order are server-owned; this dialog only submits kode, nama, and catatan.

const inputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";
const textareaClass =
  "w-full rounded-lg border border-outline/60 bg-white px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";

const KODE_MAX = 30;
const NAMA_MAX = 200;
const NOTE_MAX = 2000;

function snapshotOf(kode: string, nama: string, note: string): string {
  return JSON.stringify({ kode, nama, note });
}

export default function RegulationSubKategoriDialog({
  disiplinSlug,
  disiplinName,
  record,
  onClose,
  onSaved,
}: {
  disiplinSlug: string;
  disiplinName: string;
  record?: RegulationSubKategoriDto;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const formId = useId();
  const titleId = `${formId}-title`;
  const kodeId = `${formId}-kode`;
  const namaId = `${formId}-nama`;
  const noteId = `${formId}-note`;
  const noteHelpId = `${formId}-note-help`;

  const [kode, setKode] = useState(record?.kode ?? "");
  const [nama, setNama] = useState(record?.nama ?? "");
  const [note, setNote] = useState(record?.note ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [initialSnapshot] = useState(() =>
    snapshotOf(record?.kode ?? "", record?.nama ?? "", record?.note ?? ""),
  );

  const dirty = snapshotOf(kode, nama, note) !== initialSnapshot;
  const editing = record !== undefined;

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

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (submitting) return;

    const trimmedKode = kode.trim();
    const trimmedNama = nama.trim();
    const trimmedNote = note.trim();

    if (trimmedKode.length === 0) {
      setFormError("Kode wajib diisi.");
      return;
    }
    if (trimmedKode.length > KODE_MAX) {
      setFormError(`Kode maksimal ${KODE_MAX} karakter.`);
      return;
    }
    if (trimmedNama.length === 0) {
      setFormError("Nama sub-kategori wajib diisi.");
      return;
    }
    if (trimmedNama.length > NAMA_MAX) {
      setFormError(`Nama sub-kategori maksimal ${NAMA_MAX} karakter.`);
      return;
    }
    if (trimmedNote.length > NOTE_MAX) {
      setFormError(
        `Catatan maksimal ${NOTE_MAX.toLocaleString("id-ID")} karakter.`,
      );
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const endpoint = editing
        ? `/api/regulation/sub-kategori/${record.id}`
        : `/api/regulation/${encodeURIComponent(disiplinSlug)}/sub-kategori`;
      const response = await fetch(endpoint, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kode: trimmedKode,
          nama: trimmedNama,
          note: trimmedNote,
        }),
      });
      if (!response.ok) {
        setFormError(
          await readRegulationApiError(
            response,
            editing
              ? "Gagal menyimpan perubahan sub-kategori."
              : "Gagal menambahkan sub-kategori.",
          ),
        );
        return;
      }
      onSaved(
        editing
          ? "Sub-kategori berhasil disimpan."
          : "Sub-kategori berhasil ditambahkan.",
      );
    } catch {
      setFormError(
        editing
          ? "Gagal menyimpan perubahan sub-kategori. Periksa koneksi lalu coba lagi."
          : "Gagal menambahkan sub-kategori. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RegulationDialogShell
      titleId={titleId}
      eyebrow={`Standard & Regulation · ${disiplinName}`}
      title={editing ? "Edit Sub-Kategori" : "Tambah Sub-Kategori"}
      description={
        editing
          ? "Perubahan berlaku untuk kode, nama, dan catatan sub-kategori."
          : `Tambahkan sub-kategori baru pada disiplin ${disiplinName}.`
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
            <span className={labelClass}>Disiplin</span>
            <div className="flex h-10 items-center rounded-lg border border-outline/60 bg-slate-50 px-3.5 text-xs font-bold text-primary/70">
              {disiplinName}
            </div>
            <p className="mt-1 text-[11px] text-primary/45">
              Disiplin mengikuti halaman dan tidak dapat diubah.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <div>
              <label htmlFor={kodeId} className={labelClass}>
                Kode <span className="text-red-700">*</span>
              </label>
              <input
                id={kodeId}
                type="text"
                value={kode}
                maxLength={KODE_MAX}
                disabled={submitting}
                data-autofocus="true"
                onChange={(event) => setKode(event.target.value)}
                placeholder="cth. PW.01"
                className={`${inputClass} font-mono uppercase`}
              />
            </div>
            <div>
              <label htmlFor={namaId} className={labelClass}>
                Nama Sub-Kategori <span className="text-red-700">*</span>
              </label>
              <input
                id={namaId}
                type="text"
                value={nama}
                maxLength={NAMA_MAX}
                disabled={submitting}
                onChange={(event) => setNama(event.target.value)}
                placeholder="cth. Perencanaan"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor={noteId} className={labelClass}>
              Catatan
            </label>
            <textarea
              id={noteId}
              rows={4}
              value={note}
              maxLength={NOTE_MAX}
              disabled={submitting}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Catatan tambahan, ruang lingkup, atau pengecualian..."
              aria-describedby={noteHelpId}
              className={`${textareaClass} min-h-24 resize-y`}
            />
            <p
              id={noteHelpId}
              className="mt-1 text-[11px] text-primary/45"
            >
              {note.trim().length.toLocaleString("id-ID")} /{" "}
              {NOTE_MAX.toLocaleString("id-ID")} karakter
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
                : "Simpan"}
          </button>
        </div>
      </form>
    </RegulationDialogShell>
  );
}
