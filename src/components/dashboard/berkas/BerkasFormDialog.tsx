"use client";

import { useEffect, useId, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  BERKAS_UPLOAD_TOKEN_URL,
  PDF_MAX_BYTES,
  TTD_MAX_BYTES,
  buildOriginalUploadPath,
  buildPenyusunTtdUploadPath,
  getPdfPageCount,
  readApiErrorMessage,
} from "@/components/dashboard/berkas/client";
import {
  formatBerkasSize,
  type BerkasDto,
  type BerkasListResponse,
  type BerkasUserOptionDto,
} from "@/components/dashboard/berkas/types";

const inputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";
const fileLabelClass =
  "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-outline bg-background/40 px-4 py-5 text-center transition-colors hover:border-secondary/60 hover:bg-blue-50/40";

function isImageFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return (
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg")
  );
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export default function BerkasFormDialog({
  currentUser,
  onClose,
  onSaved,
}: {
  currentUser: { id: string; name: string; position: string };
  onClose: () => void;
  onSaved: (record: BerkasDto) => void;
}) {
  const titleId = useId();
  const judulId = useId();
  const pdfId = useId();
  const ttdId = useId();
  const jabatanPenyusunId = useId();
  const validator1Id = useId();
  const validator2Id = useId();
  const jabatanValidator1Id = useId();
  const jabatanValidator2Id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const [judul, setJudul] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [ttdFile, setTtdFile] = useState<File | null>(null);
  const [ttdPreview, setTtdPreview] = useState<string | null>(null);
  const [jabatanPenyusun, setJabatanPenyusun] = useState("");
  const [validator1, setValidator1] = useState("");
  const [validator2, setValidator2] = useState("");
  const [jabatanValidator1, setJabatanValidator1] = useState("");
  const [jabatanValidator2, setJabatanValidator2] = useState("");
  const [options, setOptions] = useState<BerkasUserOptionDto[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previousFocus =
      window.document.activeElement instanceof HTMLElement
        ? window.document.activeElement
        : null;
    const previousOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (ttdPreview) URL.revokeObjectURL(ttdPreview);
    };
  }, [ttdPreview]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadOptions(): Promise<void> {
      setOptionsLoading(true);
      setOptionsError(null);
      try {
        const response = await fetch("/api/berkas/user-options", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            await readApiErrorMessage(
              response,
              "Gagal memuat daftar validator.",
            ),
          );
        }
        const body = (await response.json()) as BerkasListResponse;
        if (!Array.isArray(body.data)) throw new Error("Format data tidak valid.");
        const next = body.data.filter(
          (item): item is BerkasUserOptionDto =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as BerkasUserOptionDto).id === "string" &&
            typeof (item as BerkasUserOptionDto).name === "string" &&
            typeof (item as BerkasUserOptionDto).position === "string",
        );
        if (active) setOptions(next);
      } catch (loadError) {
        if (!active || controller.signal.aborted) return;
        setOptionsError(
          loadError instanceof Error
            ? loadError.message
            : "Gagal memuat daftar validator.",
        );
      } finally {
        if (active) setOptionsLoading(false);
      }
    }

    void loadOptions();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onClose();
      }
    }
    window.document.addEventListener("keydown", handleKeyDown);
    return () => window.document.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose]);

  function handleTab(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && window.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && window.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handlePdfChange(file: File | null): void {
    setError(null);
    if (!file) return;
    if (!isPdfFile(file)) {
      setError("File asli harus berformat PDF.");
      return;
    }
    if (file.size <= 0 || file.size > PDF_MAX_BYTES) {
      setError("Ukuran PDF harus lebih dari 0 dan maksimal 20 MB.");
      return;
    }
    setPdfFile(file);
  }

  function handleTtdChange(file: File | null): void {
    setError(null);
    if (!file) return;
    if (!isImageFile(file)) {
      setError("TTD penyusun harus berupa gambar PNG atau JPG.");
      return;
    }
    if (file.size <= 0 || file.size > TTD_MAX_BYTES) {
      setError("Ukuran TTD maksimal 2 MB.");
      return;
    }
    setTtdFile(file);
    setTtdPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy) return;

    const trimmedJudul = judul.trim();
    if (!trimmedJudul) {
      setError("Nama Berkas wajib diisi.");
      return;
    }
    if (!pdfFile) {
      setError("Pilih file PDF terlebih dahulu.");
      return;
    }
    if (!ttdFile) {
      setError("Upload TTD penyusun terlebih dahulu.");
      return;
    }
    if (!validator1 || !validator2) {
      setError("Pilih Validator 1 dan Validator 2.");
      return;
    }
    if (validator1 === validator2) {
      setError("Validator 1 dan Validator 2 harus orang berbeda.");
      return;
    }
    const trimmedJabatanPenyusun = jabatanPenyusun.trim();
    const trimmedJabatanValidator1 = jabatanValidator1.trim();
    const trimmedJabatanValidator2 = jabatanValidator2.trim();
    if (!trimmedJabatanPenyusun) {
      setError("Jabatan Penyusun wajib diisi.");
      return;
    }
    if (!trimmedJabatanValidator1) {
      setError("Jabatan Validator 1 wajib diisi.");
      return;
    }
    if (!trimmedJabatanValidator2) {
      setError("Jabatan Validator 2 wajib diisi.");
      return;
    }

    const validator1Name = options.find((option) => option.id === validator1)?.name;
    const validator2Name = options.find((option) => option.id === validator2)?.name;

    setBusy(true);
    setError(null);
    setProgress(0);

    try {
      const uploadId = crypto.randomUUID();
      const pageCount = await getPdfPageCount(pdfFile);
      if (pageCount < 1 || pageCount > 200) {
        throw new Error("PDF harus memiliki 1–200 halaman.");
      }
      setProgress(10);

      const pdfPath = buildOriginalUploadPath(currentUser.id, uploadId);
      const ttdPath = buildPenyusunTtdUploadPath(currentUser.id, uploadId, ttdFile);

      const originalPdf = await upload(pdfPath, pdfFile, {
        access: "private",
        handleUploadUrl: BERKAS_UPLOAD_TOKEN_URL,
        clientPayload: JSON.stringify({ kind: "original", uploadId }),
        contentType: "application/pdf",
        onUploadProgress: ({ percentage }) => {
          setProgress(Math.max(10, Math.round(percentage * 0.65)));
        },
      });

      const penyusunTtd = await upload(ttdPath, ttdFile, {
        access: "private",
        handleUploadUrl: BERKAS_UPLOAD_TOKEN_URL,
        clientPayload: JSON.stringify({
          kind: "penyusun_ttd",
          uploadId,
          urutan: 1,
        }),
        contentType: ttdFile.type,
        onUploadProgress: ({ percentage }) => {
          setProgress(70 + Math.round(percentage * 0.15));
        },
      });

      setProgress(90);
      const response = await fetch("/api/berkas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judul: trimmedJudul,
          uploadId,
          originalPdf: {
            pathname: originalPdf.pathname,
            fileName: pdfFile.name,
            pageCount,
          },
          penyusun: [
            {
              userId: currentUser.id,
              nama: currentUser.name,
              jabatan: trimmedJabatanPenyusun,
              urutan: 1,
              ttdPathname: penyusunTtd.pathname,
            },
          ],
          validasi: [
            {
              userId: validator1,
              nama: validator1Name,
              jabatan: trimmedJabatanValidator1,
              urutan: 1,
            },
            {
              userId: validator2,
              nama: validator2Name,
              jabatan: trimmedJabatanValidator2,
              urutan: 2,
            },
          ],
        }),
      });
      if (!response.ok) {
        throw new Error(
          await readApiErrorMessage(response, "Gagal menyimpan Berkas."),
        );
      }
      const body = (await response.json()) as { data?: BerkasDto };
      if (!body.data) throw new Error("Respons penyimpanan tidak valid.");
      setProgress(100);
      onSaved(body.data);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Gagal menyimpan Berkas. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
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
              Berkas
            </p>
            <h2 id={titleId} className="mt-0.5 text-lg font-bold text-primary">
              Ajukan Berkas
            </h2>
            <p className="mt-0.5 text-xs text-primary/55">
              PDF asli, TTD penyusun, dan dua validator akan disimpan permanen.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={busy}
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
          onSubmit={(event) => void handleSubmit(event)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            {error ? (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs font-semibold text-red-700">
                {error}
              </div>
            ) : null}

            <div>
              <label htmlFor={judulId} className={labelClass}>
                Nama Berkas <span className="text-red-600">*</span>
              </label>
              <input
                id={judulId}
                type="text"
                value={judul}
                maxLength={200}
                disabled={busy}
                onChange={(event) => setJudul(event.target.value)}
                placeholder="Contoh: Berita Acara Pemeriksaan Pekerjaan"
                className={inputClass}
              />
            </div>

            <div>
              <span className={labelClass}>
                Upload PDF <span className="text-red-600">*</span>
              </span>
              <label htmlFor={pdfId} className={fileLabelClass}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="mb-2 text-secondary" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M8 13h8" />
                  <path d="M8 17h5" />
                </svg>
                <span className="text-xs font-bold text-primary">
                  {pdfFile ? pdfFile.name : "Pilih PDF"}
                </span>
                <span className="mt-1 text-[11px] text-primary/50">
                  {pdfFile ? formatBerkasSize(pdfFile.size) : "Maksimal 20 MB"}
                </span>
              </label>
              <input
                id={pdfId}
                type="file"
                accept="application/pdf,.pdf"
                disabled={busy}
                onChange={(event) => handlePdfChange(event.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </div>

            <div className="rounded-xl border border-outline/70 bg-background/30 p-4">
              <div className="mb-3">
                <p className="text-xs font-bold text-primary">Penyusun</p>
                <p className="mt-0.5 text-[11px] text-primary/55">
                  Penyusun mengikuti akun yang sedang login.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${judulId}-penyusun`} className={labelClass}>
                    Nama Penyusun
                  </label>
                  <input
                    id={`${judulId}-penyusun`}
                    type="text"
                    value={currentUser.name}
                    readOnly
                    disabled
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor={jabatanPenyusunId} className={labelClass}>
                    Jabatan Penyusun <span className="text-red-600">*</span>
                  </label>
                  <input
                    id={jabatanPenyusunId}
                    type="text"
                    value={jabatanPenyusun}
                    maxLength={150}
                    required
                    disabled={busy}
                    onChange={(event) => setJabatanPenyusun(event.target.value)}
                    placeholder={currentUser.position || "Contoh: Site Engineer"}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="mt-4">
                <span className={labelClass}>
                  Upload TTD Penyusun <span className="text-red-600">*</span>
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <label htmlFor={ttdId} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-outline bg-white px-3.5 py-2.5 text-xs font-bold text-primary transition-colors hover:border-secondary/60 hover:text-secondary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 3v12" />
                      <path d="m7 10 5 5 5-5" />
                      <path d="M5 21h14" />
                    </svg>
                    {ttdFile ? "Ganti TTD" : "Pilih gambar TTD"}
                  </label>
                  <input
                    id={ttdId}
                    type="file"
                    accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                    disabled={busy}
                    onChange={(event) => handleTtdChange(event.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                  {ttdPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ttdPreview}
                      alt="Pratinjau TTD penyusun"
                      className="h-12 w-24 rounded-lg border border-outline bg-white object-contain p-1"
                    />
                  ) : null}
                  <span className="text-[11px] font-medium text-primary/50">
                    PNG/JPG, maksimal 2 MB
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label htmlFor={validator1Id} className={labelClass}>
                    Validator 1 <span className="text-red-600">*</span>
                  </label>
                  <select
                    id={validator1Id}
                    value={validator1}
                    disabled={busy || optionsLoading}
                    onChange={(event) => setValidator1(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">
                      {optionsLoading ? "Memuat..." : "Pilih Validator 1"}
                    </option>
                    {options.map((option) => (
                      <option key={option.id} value={option.id} disabled={option.id === validator2}>
                        {option.name} — {option.position}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={jabatanValidator1Id} className={labelClass}>
                    Jabatan Validasi 1 <span className="text-red-600">*</span>
                  </label>
                  <input
                    id={jabatanValidator1Id}
                    type="text"
                    value={jabatanValidator1}
                    maxLength={150}
                    required
                    disabled={busy}
                    onChange={(event) => setJabatanValidator1(event.target.value)}
                    placeholder="Contoh: Project Manager"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor={validator2Id} className={labelClass}>
                    Validator 2 <span className="text-red-600">*</span>
                  </label>
                  <select
                    id={validator2Id}
                    value={validator2}
                    disabled={busy || optionsLoading}
                    onChange={(event) => setValidator2(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">
                      {optionsLoading ? "Memuat..." : "Pilih Validator 2"}
                    </option>
                    {options.map((option) => (
                      <option key={option.id} value={option.id} disabled={option.id === validator1}>
                        {option.name} — {option.position}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={jabatanValidator2Id} className={labelClass}>
                    Jabatan Validasi 2 <span className="text-red-600">*</span>
                  </label>
                  <input
                    id={jabatanValidator2Id}
                    type="text"
                    value={jabatanValidator2}
                    maxLength={150}
                    required
                    disabled={busy}
                    onChange={(event) => setJabatanValidator2(event.target.value)}
                    placeholder="Contoh: Engineering Manager"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
            {optionsError ? (
              <p className="text-[11px] font-semibold text-red-700">{optionsError}</p>
            ) : null}

            {busy && progress !== null ? (
              <div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-secondary transition-[width] duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] font-medium text-primary/55">
                  Mengunggah dan menyimpan Berkas... {progress}%
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-outline bg-background/40 px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-outline bg-white px-4 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={busy || optionsLoading}
              className="rounded-lg bg-secondary px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Menyimpan..." : "Ajukan Berkas"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
