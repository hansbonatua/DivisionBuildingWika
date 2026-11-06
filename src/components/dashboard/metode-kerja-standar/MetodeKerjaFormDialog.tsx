"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import MetodeKerjaDeleteDialog from "@/components/dashboard/metode-kerja-standar/MetodeKerjaDeleteDialog";
import PicMultiSelect, {
  type PicOption,
} from "@/components/dashboard/metode-kerja-standar/PicMultiSelect";
import { formatMetodeKerjaDate } from "@/components/dashboard/metode-kerja-standar/MetodeKerjaTable";
import { isSafeMetodeKerjaUrl } from "@/lib/metode-kerja-standar/schema";
import type {
  MetodeKerjaItemDto,
  MetodeKerjaSubKategoriDto,
} from "@/lib/metode-kerja-standar/service";

// Create/edit dialog for one MKS record (sub-kategori or item).
//
// Field set, validation and modal behaviour follow KnowledgeFormDialog, with
// three MKS-specific rules:
//   - the parent (disiplin, or sub-kategori for an item) is read-only;
//   - an item needs at least one PIC, a sub-kategori may have none;
//   - editing a sub-kategori offers "Tambah Item di Bawah" (D-D-01), which
//     hands control back to the page so a new item form opens with the
//     sub-kategori already filled in.
//
// There is no sort_order field: ordering is owned by the reorder endpoint.

export type MetodeKerjaFormTarget =
  | {
      kind: "sub-kategori";
      mode: "create";
      disiplinCode: string;
      disiplinSlug: string;
      disiplinName: string;
    }
  | {
      kind: "sub-kategori";
      mode: "edit";
      disiplinCode: string;
      disiplinSlug: string;
      disiplinName: string;
      record: MetodeKerjaSubKategoriDto;
    }
  | {
      kind: "item";
      mode: "create";
      disiplinCode: string;
      disiplinSlug: string;
      disiplinName: string;
      parent: MetodeKerjaSubKategoriDto;
    }
  | {
      kind: "item";
      mode: "edit";
      disiplinCode: string;
      disiplinSlug: string;
      disiplinName: string;
      parent: MetodeKerjaSubKategoriDto;
      record: MetodeKerjaItemDto;
    };

const KODE_MAX = 30;
const NAMA_MAX = 200;
const NOTE_MAX = 2000;
const URL_MAX = 2048;

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
    return "Anda tidak memiliki akses untuk mengubah Metode Kerja Standar.";
  }
  if (response.status === 404) {
    return "Data tidak ditemukan. Muat ulang halaman.";
  }
  return fallback;
}

function picOptionsFromRecord(
  pics: readonly { user_id: string; name: string; status: string; position: string }[],
): PicOption[] {
  return pics.map((pic) => ({
    user_id: pic.user_id,
    name: pic.name,
    status: pic.status,
    position: pic.position,
  }));
}

function snapshotOf(
  kode: string,
  nama: string,
  picIds: string[],
  evidenceUrl: string,
  note: string,
): string {
  return JSON.stringify({
    kode,
    nama,
    picIds: [...picIds].sort(),
    evidenceUrl,
    note,
  });
}

export default function MetodeKerjaFormDialog({
  target,
  canDelete,
  onClose,
  onSaved,
  onDeleted,
  onAddItem,
}: {
  target: MetodeKerjaFormTarget;
  canDelete: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  onDeleted: (message: string) => void;
  onAddItem?: (parent: MetodeKerjaSubKategoriDto) => void;
}) {
  const formId = useId();
  const titleId = `${formId}-title`;
  const kodeId = `${formId}-kode`;
  const namaId = `${formId}-nama`;
  const evidenceUrlId = `${formId}-evidence-url`;
  const noteId = `${formId}-note`;
  const picId = `${formId}-pic`;

  const existingSub = target.mode === "edit" && target.kind === "sub-kategori"
    ? target.record
    : null;
  const existingItem = target.mode === "edit" && target.kind === "item"
    ? target.record
    : null;
  const initialPics =
    target.kind === "sub-kategori"
      ? existingSub?.pics ?? []
      : existingItem?.pics ?? [];

  const [kode, setKode] = useState(existingSub?.kode ?? existingItem?.kode ?? "");
  const [nama, setNama] = useState(existingSub?.nama ?? existingItem?.nama ?? "");
  const [picIds, setPicIds] = useState<string[]>(
    initialPics.map((pic) => pic.user_id),
  );
  const [evidenceUrl, setEvidenceUrl] = useState(
    existingSub?.evidence_url ?? existingItem?.evidence_url ?? "",
  );
  const [note, setNote] = useState(
    existingSub?.note ?? existingItem?.note ?? "",
  );
  const [picOptions] = useState<PicOption[]>(() =>
    picOptionsFromRecord(initialPics),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [initialSnapshot] = useState(() =>
    snapshotOf(
      existingSub?.kode ?? existingItem?.kode ?? "",
      existingSub?.nama ?? existingItem?.nama ?? "",
      initialPics.map((pic) => pic.user_id),
      existingSub?.evidence_url ?? existingItem?.evidence_url ?? "",
      existingSub?.note ?? existingItem?.note ?? "",
    ),
  );

  const dialogRef = useRef<HTMLDivElement>(null);
  const currentSnapshot = snapshotOf(kode, nama, picIds, evidenceUrl, note);
  const dirty = currentSnapshot !== initialSnapshot;
  const isItem = target.kind === "item";
  const label = isItem ? "Item" : "Sub-Kategori";
  const submitLabel = target.mode === "create" ? "Simpan" : "Simpan Perubahan";

  const requestClose = useCallback(() => {
    if (submitting) return;
    if (dirty && !window.confirm("Perubahan belum disimpan. Tutup form?")) {
      return;
    }
    onClose();
  }, [dirty, onClose, submitting]);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const target =
      dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]") ??
      dialogRef.current?.querySelector<HTMLElement>(
        "button, input, textarea, select",
      );
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

  function endpointFor(): string {
    if (target.kind === "sub-kategori") {
      return target.mode === "create"
        ? `/api/metode-kerja-standar/${target.disiplinSlug}/sub-kategori`
        : `/api/metode-kerja-standar/sub-kategori/${target.record.id}`;
    }
    return target.mode === "create"
      ? `/api/metode-kerja-standar/sub-kategori/${target.parent.id}/item`
      : `/api/metode-kerja-standar/item/${target.record.id}`;
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (submitting) return;

    const trimmedKode = kode.trim();
    const trimmedNama = nama.trim();
    const trimmedUrl = evidenceUrl.trim();
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
      setFormError("Nama wajib diisi.");
      return;
    }
    if (trimmedNama.length > NAMA_MAX) {
      setFormError(`Nama maksimal ${NAMA_MAX} karakter.`);
      return;
    }
    if (isItem && picIds.length === 0) {
      setFormError("Item wajib memiliki minimal 1 PIC.");
      return;
    }
    if (trimmedUrl.length > URL_MAX) {
      setFormError(`URL evidence maksimal ${URL_MAX.toLocaleString("id-ID")} karakter.`);
      return;
    }
    if (trimmedUrl.length > 0 && !isSafeMetodeKerjaUrl(trimmedUrl)) {
      setFormError("URL evidence harus diawali http:// atau https://.");
      return;
    }
    if (trimmedNote.length > NOTE_MAX) {
      setFormError(`Catatan maksimal ${NOTE_MAX.toLocaleString("id-ID")} karakter.`);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch(endpointFor(), {
        method: target.mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kode: trimmedKode,
          nama: trimmedNama,
          pic_ids: picIds,
          evidence_url: trimmedUrl,
          note: trimmedNote,
        }),
      });
      if (!response.ok) {
        setFormError(
          await readApiErrorMessage(
            response,
            target.mode === "create"
              ? `Gagal menambahkan ${label}.`
              : `Gagal menyimpan perubahan ${label}.`,
          ),
        );
        return;
      }
      onSaved(
        target.mode === "create"
          ? `${label} berhasil ditambahkan.`
          : `${label} berhasil disimpan.`,
      );
    } catch {
      setFormError(
        target.mode === "create"
          ? `Gagal menambahkan ${label}. Periksa koneksi lalu coba lagi.`
          : `Gagal menyimpan perubahan ${label}. Periksa koneksi lalu coba lagi.`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const parentSub = target.kind === "item" ? target.parent : null;

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
          className="flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-2xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-outline bg-background/60 px-5 py-4 sm:px-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">
                Metode Kerja Standar · Disiplin {target.disiplinCode}
              </p>
              <h2 id={titleId} className="mt-0.5 text-lg font-bold text-primary">
                {target.mode === "create" ? `Tambah ${label}` : `Edit ${label}`}
              </h2>
              <p className="mt-0.5 text-xs text-primary/55">
                {target.mode === "create"
                  ? `Lengkapi ${label.toLowerCase()} di bawah ${target.disiplinName}.`
                  : "Perubahan diterapkan ke kode, nama, PIC, evidence, dan catatan sekaligus."}
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
                  <span className={labelClass}>Disiplin</span>
                  <div className="flex h-10 items-center rounded-lg border border-outline/60 bg-slate-50 px-3.5 text-xs font-bold text-primary/70">
                    {target.disiplinCode}. {target.disiplinName}
                  </div>
                  <p className="mt-1 text-[11px] text-primary/45">
                    Disiplin mengikuti halaman dan tidak dapat diubah.
                  </p>
                </div>

                <div>
                  <span className={labelClass}>
                    {isItem ? "Sub-Kategori" : "Level"}
                  </span>
                  <div className="flex h-10 items-center rounded-lg border border-outline/60 bg-slate-50 px-3.5 text-xs font-bold text-primary/70">
                    {isItem && parentSub
                      ? `${parentSub.kode} ${parentSub.nama}`
                      : "Sub-Kategori"}
                  </div>
                  <p className="mt-1 text-[11px] text-primary/45">
                    {isItem
                      ? "Sub-kategori induk tidak dapat diubah saat edit."
                      : "Sub-kategori berada langsung di bawah disiplin."}
                  </p>
                </div>
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
                    placeholder="cth. A.1"
                    className={`${inputClass} font-mono uppercase`}
                  />
                </div>
                <div>
                  <label htmlFor={namaId} className={labelClass}>
                    Nama <span className="text-red-700">*</span>
                  </label>
                  <input
                    id={namaId}
                    type="text"
                    value={nama}
                    maxLength={NAMA_MAX}
                    disabled={submitting}
                    onChange={(event) => setNama(event.target.value)}
                    placeholder="cth. Pekerjaan Pondasi"
                    className={inputClass}
                  />
                </div>
              </div>

              <PicMultiSelect
                id={picId}
                value={picIds}
                onChange={setPicIds}
                initialOptions={picOptions}
                disabled={submitting}
                required={isItem}
                hint={
                  isItem
                    ? "Wajib minimal 1 PIC. Hanya user Head Office; status suspended tetap dapat dipilih."
                    : "Opsional untuk sub-kategori. Hanya user Head Office; status suspended tetap dapat dipilih."
                }
              />

              <div>
                <label htmlFor={evidenceUrlId} className={labelClass}>
                  URL Evidence
                </label>
                <input
                  id={evidenceUrlId}
                  type="url"
                  value={evidenceUrl}
                  disabled={submitting}
                  onChange={(event) => setEvidenceUrl(event.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
                <p className="mt-1 text-[11px] text-primary/45">
                  Opsional. Gunakan tautan HTTP/HTTPS.
                </p>
              </div>

              <div>
                <label htmlFor={noteId} className={labelClass}>
                  Catatan
                </label>
                <textarea
                  id={noteId}
                  rows={4}
                  value={note}
                  disabled={submitting}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Catatan tambahan, ruang lingkup, atau pengecualian..."
                  className={`${textareaClass} min-h-24 resize-y`}
                />
                <p className="mt-1 text-[11px] text-primary/45">
                  {note.trim().length.toLocaleString("id-ID")} /{" "}
                  {NOTE_MAX.toLocaleString("id-ID")} karakter
                </p>
              </div>

              {target.mode === "edit" && target.kind === "sub-kategori" && onAddItem ? (
                <div className="rounded-xl border border-outline/60 bg-background/60 p-4">
                  <p className="text-xs font-bold text-primary">Item di bawah sub-kategori ini</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-primary/60">
                    {target.record.items.length === 0
                      ? "Belum ada item. Tambahkan item pertama tanpa menutup konteks sub-kategori."
                      : `${target.record.items.length} item terdaftar. Sub-kategori induk sudah terisi otomatis.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => onAddItem(target.record)}
                    disabled={submitting}
                    className="mt-3 rounded-lg border border-outline bg-white px-3.5 py-2 text-[11px] font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Tambah Item di Bawah
                  </button>
                </div>
              ) : null}

              {target.mode === "edit" ? (
                <div className="grid gap-3 rounded-xl border border-outline/60 bg-background/60 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-primary/45">
                      Created By
                    </p>
                    <p className="mt-1 text-xs font-semibold text-primary">
                      {target.record.created_by.name}
                    </p>
                    <p className="text-[11px] text-primary/50">
                      {formatMetodeKerjaDate(target.record.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-primary/45">
                      Updated By
                    </p>
                    <p className="mt-1 text-xs font-semibold text-primary">
                      {target.record.updated_by?.name ?? "—"}
                    </p>
                    <p className="text-[11px] text-primary/50">
                      {formatMetodeKerjaDate(target.record.updated_at)}
                    </p>
                  </div>
                </div>
              ) : null}

              {target.mode === "edit" && canDelete ? (
                <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
                  <p className="text-xs font-bold text-red-800">Hapus {label.toLowerCase()}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-red-700/80">
                    {target.kind === "sub-kategori"
                      ? "Penghapusan ditolak selama sub-kategori masih memiliki item."
                      : "Item, seluruh PIC item, dan evidence-nya akan dihapus permanen."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    disabled={submitting}
                    className="mt-3 rounded-lg border border-red-300 bg-white px-3.5 py-2 text-[11px] font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Hapus {label.toLowerCase()}
                  </button>
                </div>
              ) : null}

              {formError ? (
                <div
                  role="alert"
                  className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
                >
                  {formError}
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
                disabled={submitting}
                className="rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Menyimpan..." : submitLabel}
              </button>
            </div>
          </form>
        </div>
      </div>

      {deleteOpen && target.mode === "edit" ? (
        <MetodeKerjaDeleteDialog
          kind={target.kind}
          id={target.record.id}
          kode={target.record.kode}
          nama={target.record.nama}
          itemCount={
            target.kind === "sub-kategori" ? target.record.items.length : undefined
          }
          onCancel={() => setDeleteOpen(false)}
          onDeleted={(message) => {
            setDeleteOpen(false);
            onDeleted(message);
          }}
        />
      ) : null}
    </>
  );
}
