"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useRef, useState } from "react";
import LearningDialogShell from "@/components/dashboard/learning/LearningDialogShell";
import { readLearningApiError } from "@/components/dashboard/learning/api-error";
import {
  formatLearningFileSize,
  isLearningCategory,
  isLearningContentDetail,
  LEARNING_TYPE_LABELS,
  learningFileTypeLabel,
  type LearningAttachment,
  type LearningCategory,
  type LearningContentDetail,
  type LearningContentType,
} from "@/components/dashboard/learning/types";
import {
  LEARNING_CATEGORY_NAME_MAX_LENGTH,
  LEARNING_DESCRIPTION_MAX_LENGTH,
  LEARNING_MAX_ATTACHMENTS,
  LEARNING_TITLE_MAX_LENGTH,
} from "@/lib/learning/constants";
import {
  buildLearningAttachmentPathname,
  buildLearningThumbnailPathname,
  isLearningAttachmentFileName,
  isLearningThumbnailFileName,
  LEARNING_ATTACHMENT_MAX_BYTES,
  LEARNING_THUMBNAIL_MAX_BYTES,
  learningAttachmentDefaultMimeType,
} from "@/lib/learning/storage-path";

const UPLOAD_TOKEN_URL = "/api/learning/upload-token";
const CLEANUP_URL = "/api/learning/upload/cleanup";
const THUMBNAIL_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
const ATTACHMENT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,application/pdf";

const inputClass =
  "w-full rounded-lg border border-outline/60 bg-white px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

type PendingAttachment = { key: string; file: File };

function displayName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").trim();
  return (base === "" ? fileName : base).slice(0, 255);
}

function newKey(): string {
  return globalThis.crypto.randomUUID();
}

export default function LearningFormDialog({
  mode,
  type,
  record,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  type: LearningContentType;
  record?: LearningContentDetail;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [contentType, setContentType] = useState<LearningContentType>(type);
  const [judul, setJudul] = useState(record?.judul ?? "");
  const [deskripsi, setDeskripsi] = useState(record?.deskripsi ?? "");
  const [kategoriId, setKategoriId] = useState(record?.kategori.id ?? "");
  const [videoUrl, setVideoUrl] = useState(record?.video_embed_url ?? "");
  const [externalUrl, setExternalUrl] = useState(record?.external_url ?? "");

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [keptAttachments, setKeptAttachments] = useState<LearningAttachment[]>(
    record?.attachments ?? [],
  );
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([]);

  const [categories, setCategories] = useState<LearningCategory[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Object URLs are created in the change handler, not in an effect: the
  // preview must not trigger a second render pass. The previous URL is revoked
  // as soon as it is replaced, and the last one on unmount.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  function applyThumbnailFile(file: File | null): void {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    const url = file ? URL.createObjectURL(file) : null;
    if (url) previewUrlRef.current = url;
    setThumbnailFile(file);
    setThumbnailPreview(url);
  }

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadCategories(): Promise<void> {
      try {
        const response = await fetch("/api/learning/categories", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error();
        const body = (await response.json()) as { data?: unknown };
        if (!active) return;
        if (!Array.isArray(body.data)) throw new Error();
        const list = body.data.filter(isLearningCategory);
        setCategories(list);
        setCategoriesError(null);
        setKategoriId((current) => current || list[0]?.id || "");
      } catch {
        if (active && !controller.signal.aborted) {
          setCategoriesError("Gagal memuat daftar kategori.");
        }
      }
    }

    void loadCategories();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const isSharing = contentType === "sharing";
  const attachmentCount = keptAttachments.length + pendingAttachments.length;
  const previewSrc = thumbnailPreview ?? record?.thumbnail_url ?? null;

  function handleThumbnailChange(file: File | null): void {
    setError(null);
    if (!file) {
      applyThumbnailFile(null);
      return;
    }
    if (!isLearningThumbnailFileName(file.name)) {
      setError("Thumbnail harus berupa JPG, PNG, atau WEBP.");
      return;
    }
    if (file.size > LEARNING_THUMBNAIL_MAX_BYTES) {
      setError("Ukuran thumbnail maksimal 5 MB.");
      return;
    }
    applyThumbnailFile(file);
  }

  function handleAttachmentsChange(files: FileList | null): void {
    if (!files || files.length === 0) return;
    setError(null);
    const accepted: PendingAttachment[] = [];
    const rejected: string[] = [];
    let total = attachmentCount;

    for (const file of Array.from(files)) {
      if (total >= LEARNING_MAX_ATTACHMENTS) {
        rejected.push(`maksimal ${LEARNING_MAX_ATTACHMENTS} lampiran`);
        break;
      }
      if (!isLearningAttachmentFileName(file.name)) {
        rejected.push(`${file.name}: format tidak didukung`);
        continue;
      }
      if (file.size > LEARNING_ATTACHMENT_MAX_BYTES) {
        rejected.push(`${file.name}: melebihi 20 MB`);
        continue;
      }
      accepted.push({ key: newKey(), file });
      total += 1;
    }

    if (accepted.length > 0) {
      setPendingAttachments((current) => [...current, ...accepted]);
    }
    if (rejected.length > 0) {
      setError(`Sebagian file dilewati (${rejected.join("; ")}).`);
    }
  }

  async function handleCreateCategory(): Promise<void> {
    const nama = newCategoryName.trim();
    if (nama === "") return;
    setCreatingCategory(true);
    setError(null);
    try {
      const response = await fetch("/api/learning/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama }),
      });
      if (!response.ok) {
        throw new Error(
          await readLearningApiError(response, "Gagal menyimpan kategori."),
        );
      }
      const body = (await response.json()) as { data?: unknown };
      if (!isLearningCategory(body.data)) {
        throw new Error("Respons kategori tidak valid.");
      }
      const created = body.data;
      setCategories((current) =>
        current.some((item) => item.id === created.id)
          ? current
          : [...current, created],
      );
      setKategoriId(created.id);
      setNewCategoryName("");
      setShowNewCategory(false);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Gagal menyimpan kategori.",
      );
    } finally {
      setCreatingCategory(false);
    }
  }

  async function cleanupUploaded(pathnames: string[]): Promise<void> {
    await Promise.all(
      pathnames.map(async (pathname) => {
        try {
          await fetch(CLEANUP_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pathname }),
          });
        } catch {
          /* cleanup is best-effort; the server still owns the object */
        }
      }),
    );
  }

  function validate(): string | null {
    if (judul.trim() === "") return "Judul wajib diisi.";
    if (kategoriId === "") return "Kategori wajib dipilih.";
    if (mode === "create" && !thumbnailFile) {
      return "Thumbnail wajib diunggah.";
    }
    if (isSharing && videoUrl.trim() === "") {
      return "URL video YouTube/Vimeo wajib diisi untuk Sharing Session.";
    }
    if (!isSharing && externalUrl.trim() === "") {
      return "Link eksternal wajib diisi untuk Training dan Certificate.";
    }
    return null;
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (busy) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError(null);
    setProgress(0);

    // Every object uploaded during THIS submit is tracked so a failed save can
    // remove the orphans instead of leaving unreferenced bytes in Blob storage.
    const uploadedPathnames: string[] = [];

    try {
      let thumbnailPathname: string | null = null;
      if (thumbnailFile) {
        const pathname = buildLearningThumbnailPathname(thumbnailFile.name);
        if (!pathname) {
          throw new Error("Format gambar thumbnail tidak didukung.");
        }
        await upload(pathname, thumbnailFile, {
          access: "public",
          handleUploadUrl: UPLOAD_TOKEN_URL,
          clientPayload: JSON.stringify({ kind: "thumbnail" }),
          contentType: thumbnailFile.type || undefined,
          onUploadProgress: ({ percentage }) => {
            setProgress(Math.min(40, Math.round(percentage * 0.4)));
          },
        });
        uploadedPathnames.push(pathname);
        thumbnailPathname = pathname;
      }

      const uploadedAttachments: {
        nama: string;
        file_name: string;
        file_pathname: string;
      }[] = [];

      if (isSharing) {
        for (const [index, pending] of pendingAttachments.entries()) {
          const pathname = buildLearningAttachmentPathname(pending.file.name);
          if (!pathname) {
            throw new Error(`Format file ${pending.file.name} tidak didukung.`);
          }
          await upload(pathname, pending.file, {
            access: "private",
            handleUploadUrl: UPLOAD_TOKEN_URL,
            clientPayload: JSON.stringify({ kind: "attachment" }),
            contentType:
              pending.file.type ||
              learningAttachmentDefaultMimeType(pending.file.name) ||
              undefined,
            onUploadProgress: ({ percentage }) => {
              const share = 40 / Math.max(1, pendingAttachments.length);
              setProgress(
                Math.min(
                  90,
                  40 + Math.round(percentage * (share / 100) + index * share),
                ),
              );
            },
          });
          uploadedPathnames.push(pathname);
          uploadedAttachments.push({
            nama: displayName(pending.file.name),
            file_name: pending.file.name,
            file_pathname: pathname,
          });
        }
      }

      setProgress(95);

      const payload: Record<string, unknown> = {
        judul: judul.trim(),
        deskripsi: deskripsi.trim(),
        kategori_id: kategoriId,
        video_url: isSharing ? videoUrl.trim() : null,
        external_url: isSharing ? null : externalUrl.trim(),
      };
      if (thumbnailPathname) {
        payload.thumbnail_pathname = thumbnailPathname;
      }
      if (isSharing) {
        payload.attachments = [
          ...keptAttachments.map((item) => ({ id: item.id, nama: item.nama })),
          ...uploadedAttachments,
        ];
      }

      const response = await fetch(
        mode === "edit" && record
          ? `/api/learning/contents/${record.id}`
          : "/api/learning/contents",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "create" ? { ...payload, type: contentType } : payload,
          ),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readLearningApiError(response, "Gagal menyimpan konten."),
        );
      }
      const body = (await response.json()) as { data?: unknown };
      if (!isLearningContentDetail(body.data)) {
        throw new Error("Respons server tidak valid.");
      }

      onSaved(
        mode === "edit"
          ? "Konten Building Learning Center berhasil diperbarui."
          : "Konten Building Learning Center berhasil dibuat.",
      );
    } catch (submitError) {
      if (uploadedPathnames.length > 0) {
        void cleanupUploaded(uploadedPathnames);
      }
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Gagal menyimpan konten.",
      );
      setProgress(0);
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "edit" ? "Edit Konten" : "Tambah Konten";
  const titleId = "learning-form-title";

  return (
    <LearningDialogShell
      titleId={titleId}
      eyebrow={LEARNING_TYPE_LABELS[contentType]}
      title={title}
      description="Konten Building Learning Center"
      busy={busy}
      closeLabel="Tutup form konten"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
            >
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="learning-judul" className={labelClass}>
                Judul <span className="text-red-500">*</span>
              </label>
              <input
                id="learning-judul"
                type="text"
                value={judul}
                onChange={(event) => setJudul(event.target.value)}
                maxLength={LEARNING_TITLE_MAX_LENGTH}
                disabled={busy}
                required
                data-autofocus
                placeholder="Judul konten"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="learning-tipe" className={labelClass}>
                Tipe
              </label>
              <select
                id="learning-tipe"
                value={contentType}
                onChange={(event) =>
                  setContentType(event.target.value as LearningContentType)
                }
                disabled={busy || mode === "edit"}
                className={inputClass}
              >
                <option value="sharing">Sharing Session</option>
                <option value="training">Training</option>
                <option value="certificate">Certificate</option>
              </select>
              {mode === "edit" ? (
                <p className="mt-1 text-[11px] text-primary/50">
                  Tipe konten tidak dapat diubah.
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label htmlFor="learning-deskripsi" className={labelClass}>
              Deskripsi
            </label>
            <textarea
              id="learning-deskripsi"
              value={deskripsi}
              onChange={(event) => setDeskripsi(event.target.value)}
              maxLength={LEARNING_DESCRIPTION_MAX_LENGTH}
              rows={3}
              disabled={busy}
              placeholder="Ringkasan konten yang tampil di card"
              className={`${inputClass} resize-y`}
            />
            <p className="mt-1 text-[11px] text-primary/40">
              {deskripsi.length}/{LEARNING_DESCRIPTION_MAX_LENGTH}
            </p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="learning-kategori" className="text-xs font-semibold text-slate-700">
                Kategori <span className="text-red-500">*</span>
              </label>
              {!showNewCategory ? (
                <button
                  type="button"
                  onClick={() => setShowNewCategory(true)}
                  disabled={busy}
                  className="text-[11px] font-bold text-secondary hover:underline disabled:opacity-50"
                >
                  + Kategori baru
                </button>
              ) : null}
            </div>
            <select
              id="learning-kategori"
              value={kategoriId}
              onChange={(event) => setKategoriId(event.target.value)}
              disabled={busy || categories.length === 0}
              required
              className={inputClass}
            >
              <option value="">
                {categories.length === 0
                  ? "Belum ada kategori"
                  : "Pilih kategori"}
              </option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nama}
                </option>
              ))}
            </select>
            {categoriesError ? (
              <p className="mt-1 text-[11px] font-semibold text-red-600">
                {categoriesError}
              </p>
            ) : null}

            {showNewCategory ? (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  maxLength={LEARNING_CATEGORY_NAME_MAX_LENGTH}
                  disabled={busy || creatingCategory}
                  placeholder="Nama kategori baru"
                  aria-label="Nama kategori baru"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => void handleCreateCategory()}
                  disabled={
                    busy || creatingCategory || newCategoryName.trim() === ""
                  }
                  className="shrink-0 rounded-lg bg-secondary px-3.5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingCategory ? "Menyimpan..." : "Simpan"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCategory(false);
                    setNewCategoryName("");
                  }}
                  disabled={busy || creatingCategory}
                  className="shrink-0 rounded-lg border border-outline px-3 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-background disabled:opacity-50"
                >
                  Batal
                </button>
              </div>
            ) : null}
          </div>

          {isSharing ? (
            <div>
              <label htmlFor="learning-video" className={labelClass}>
                Video URL <span className="text-red-500">*</span>
              </label>
              <input
                id="learning-video"
                type="url"
                value={videoUrl}
                onChange={(event) => setVideoUrl(event.target.value)}
                disabled={busy}
                required
                placeholder="https://www.youtube.com/watch?v=... atau https://vimeo.com/..."
                className={inputClass}
              />
              <p className="mt-1 text-[11px] text-primary/40">
                Hanya tautan YouTube atau Vimeo. URL disimpan sebagai embed
                canonical.
              </p>
            </div>
          ) : (
            <div>
              <label htmlFor="learning-external" className={labelClass}>
                External Link URL <span className="text-red-500">*</span>
              </label>
              <input
                id="learning-external"
                type="url"
                value={externalUrl}
                onChange={(event) => setExternalUrl(event.target.value)}
                disabled={busy}
                required
                placeholder="https://..."
                className={inputClass}
              />
              <p className="mt-1 text-[11px] text-primary/40">
                Card Training/Certificate membuka tautan ini di tab baru.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-outline/60 bg-background/40 p-3.5">
            <p className={labelClass}>
              Thumbnail{" "}
              {mode === "create" ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="font-normal text-primary/40">(opsional)</span>
              )}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg border border-outline bg-slate-100">
                {previewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewSrc}
                    alt="Pratinjau thumbnail"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-slate-400">
                    Belum ada gambar
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <input
                  id="learning-thumbnail"
                  type="file"
                  accept={THUMBNAIL_ACCEPT}
                  disabled={busy}
                  onChange={(event) => {
                    handleThumbnailChange(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                  className="block w-full text-xs font-semibold text-primary file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3.5 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-secondary disabled:opacity-50"
                />
                <p className="text-[11px] text-primary/40">
                  JPG, PNG, atau WEBP. Maksimal 5 MB.
                </p>
                {thumbnailFile ? (
                  <p className="truncate text-[11px] font-semibold text-secondary">
                    {thumbnailFile.name} ·{" "}
                    {formatLearningFileSize(thumbnailFile.size)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {isSharing ? (
            <div className="rounded-lg border border-outline/60 bg-background/40 p-3.5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className={labelClass}>
                  Lampiran{" "}
                  <span className="font-normal text-primary/40">
                    ({attachmentCount}/{LEARNING_MAX_ATTACHMENTS})
                  </span>
                </p>
                <label className="cursor-pointer rounded-lg border border-outline bg-white px-3 py-1.5 text-[11px] font-bold text-primary transition-colors hover:bg-background">
                  + Tambah file
                  <input
                    type="file"
                    multiple
                    accept={ATTACHMENT_ACCEPT}
                    disabled={busy || attachmentCount >= LEARNING_MAX_ATTACHMENTS}
                    onChange={(event) => {
                      handleAttachmentsChange(event.target.files);
                      event.target.value = "";
                    }}
                    className="sr-only"
                  />
                </label>
              </div>

              {attachmentCount === 0 ? (
                <p className="text-[11px] text-primary/40">
                  Belum ada lampiran. PDF, Word, Excel, PowerPoint, atau ZIP;
                  maksimal 20 MB per file.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {keptAttachments.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-outline/60 bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-primary">
                          {item.nama}
                        </p>
                        <p className="text-[11px] text-primary/40">
                          {learningFileTypeLabel(item.file_name)} ·{" "}
                          {formatLearningFileSize(item.file_size_bytes)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setKeptAttachments((current) =>
                            current.filter((row) => row.id !== item.id),
                          )
                        }
                        disabled={busy}
                        className="shrink-0 text-[11px] font-bold text-red-600 hover:underline disabled:opacity-50"
                      >
                        Hapus
                      </button>
                    </li>
                  ))}
                  {pendingAttachments.map((item) => (
                    <li
                      key={item.key}
                      className="flex items-center justify-between gap-3 rounded-lg border border-secondary/30 bg-secondary/5 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-primary">
                          {item.file.name}
                        </p>
                        <p className="text-[11px] text-primary/40">
                          {learningFileTypeLabel(item.file.name)} ·{" "}
                          {formatLearningFileSize(item.file.size)} · belum
                          diunggah
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingAttachments((current) =>
                            current.filter((row) => row.key !== item.key),
                          )
                        }
                        disabled={busy}
                        className="shrink-0 text-[11px] font-bold text-red-600 hover:underline disabled:opacity-50"
                      >
                        Hapus
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <div className="border-t border-outline bg-background/60 px-5 py-3.5 sm:px-6">
          {busy ? (
            <div className="mb-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-secondary transition-all"
                  style={{ width: `${Math.max(4, progress)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] font-semibold text-primary/50">
                Mengunggah & menyimpan... {progress}%
              </p>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
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
              disabled={busy || categories.length === 0}
              className="rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </form>
    </LearningDialogShell>
  );
}
