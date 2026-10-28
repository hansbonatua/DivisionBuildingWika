"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CATEGORY_OPTIONS } from "@/lib/demo/projects";
import {
  CMS_IMAGE_ACCEPT_ATTRIBUTE,
  CMS_IMAGE_FORMAT_HINT,
  CMS_PROJECT_IMAGE_GUIDANCE,
  formatCmsImageSize,
  type CmsImageSourceType,
} from "@/lib/cms/image-source";
import {
  useCmsImageField,
  type CmsImageSubmission,
} from "@/lib/cms/use-cms-image-field";
import CmsImageSourceSelector from "@/components/dashboard/cms/CmsImageSourceSelector";
import CmsUploadProgress from "@/components/dashboard/cms/CmsUploadProgress";

export type ProjectFormValues = {
  title: string;
  category: string;
  location: string;
  progress: number;
  description: string;
  // Resolved by the shared CMS image hook: the page only forwards it to the API.
  image: CmsImageSubmission;
  imageAlt: string;
  status: "Active" | "Draft";
};

// Initial data carries the text fields only; the image is described separately
// so the edit page cannot accidentally seed a stale URL into the upload path.
export type ProjectFormData = Omit<ProjectFormValues, "image">;

type ProjectFormProps = {
  mode: "add" | "edit";
  initialData?: ProjectFormData;
  // Stored image of the record being edited (absent on create).
  initialImage?: {
    imageUrl: string;
    source: CmsImageSourceType;
    blobPathname: string | null;
  };
  submitLabel: string;
  onSubmit: (values: ProjectFormValues) => void | Promise<void>;
};

const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Draft", label: "Draft" },
] as const;

const textInputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-sm font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:opacity-60";

export default function ProjectForm({
  mode,
  initialData,
  initialImage,
  submitLabel,
  onSubmit,
}: ProjectFormProps) {
  const [formTitle, setFormTitle] = useState(initialData?.title ?? "");
  const [formCategory, setFormCategory] = useState(
    initialData && CATEGORY_OPTIONS.includes(initialData.category)
      ? initialData.category
      : CATEGORY_OPTIONS[0],
  );
  const [formLocation, setFormLocation] = useState(initialData?.location ?? "");
  const [formProgress, setFormProgress] = useState(initialData?.progress ?? 0);
  const [formDescription, setFormDescription] = useState(initialData?.description ?? "");
  const [formImageAlt, setFormImageAlt] = useState(initialData?.imageAlt ?? "");
  const [formStatus, setFormStatus] = useState<"Active" | "Draft">(
    initialData?.status ?? "Active",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const busyRef = useRef(false);

  // Shared CMS image state machine (source mode, pending file, upload, cleanup).
  // On create it defaults to Upload Gambar; on edit it mirrors the stored source.
  const image = useCmsImageField({
    module: "projects",
    initial: initialImage ?? null,
  });

  const busy = image.uploading || submitting;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    // Allow re-selecting the same file after a failed attempt.
    event.target.value = "";
    if (!file) {
      return;
    }
    setFormError(null);
    image.selectFile(file);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busyRef.current) {
      return;
    }
    if (!formTitle.trim() || !formCategory.trim() || !formLocation.trim()) {
      setFormError("Lengkapi nama proyek, kategori, dan lokasi proyek.");
      return;
    }
    setFormError(null);
    busyRef.current = true;

    const submission = await image.resolveSubmission();
    if (!submission) {
      busyRef.current = false;
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: formTitle.trim(),
        category: formCategory,
        location: formLocation.trim(),
        progress: Number.isFinite(formProgress) ? formProgress : 0,
        description: formDescription.trim(),
        image: submission,
        imageAlt: formImageAlt.trim(),
        status: formStatus,
      });
    } catch (error) {
      // The upload already succeeded but the record was not written: remove the
      // freshly uploaded object so it does not become an orphan.
      await image.cleanupOrphan(submission);
      setFormError(error instanceof Error ? error.message : "Gagal menyimpan project.");
    } finally {
      setSubmitting(false);
      busyRef.current = false;
    }
  }

  const fileInfoLabel = image.currentFileInfo
    ? image.currentFileInfo.bytes !== null
      ? `${image.currentFileInfo.name} • ${formatCmsImageSize(image.currentFileInfo.bytes)}`
      : `${image.currentFileInfo.name} • tersimpan`
    : null;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-outline/60 bg-surface shadow-sm">
        <div className="flex items-center gap-2 border-b border-outline/60 bg-background px-4 py-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-secondary">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <h3 className="text-lg font-bold text-primary">Project Information</h3>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="projectName" className="mb-1.5 block text-xs font-bold text-primary">
                Nama Proyek Resmi *
              </label>
              <input
                id="projectName"
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className={textInputClass}
              />
              <span className="mt-1 block text-[11px] text-primary/50">
                Maksimal 160 karakter untuk headline optimal.
              </span>
            </div>
            <div>
              <label htmlFor="projectCategory" className="mb-1.5 block text-xs font-bold text-primary">
                Kategori Konstruksi *
              </label>
              <select
                id="projectCategory"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className={textInputClass}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-primary/50">
                Menentukan badge klasifikasi di visual kartu.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="projectLocation" className="mb-1.5 block text-xs font-bold text-primary">
                Lokasi Proyek Geografis *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-secondary" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <input
                  id="projectLocation"
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="h-10 w-full rounded-lg border border-outline/60 bg-white pl-10 pr-3.5 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
            </div>
            <div>
              <label htmlFor="projectStatus" className="mb-1.5 block text-xs font-bold text-primary">
                Status <span className="text-red-700">*</span>
              </label>
              <select
                id="projectStatus"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as "Active" | "Draft")}
                className={textInputClass}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-primary/50">
                Hanya Active yang tampil di landing page.
              </span>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-outline bg-background/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <label htmlFor="projectProgress" className="block text-xs font-bold text-primary">
                  Status Konstruksi &amp; Milestone Penyelesaian
                </label>
                <p className="text-[11px] text-primary/70">
                  Menunjukkan persentase progres penyelesaian proyek.
                </p>
              </div>
              <div className="text-right">
                <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900">
                  {formProgress}% Selesai &amp; Beroperasi
                </span>
              </div>
            </div>
            <input
              id="projectProgress"
              type="range"
              min={0}
              max={100}
              value={formProgress}
              onChange={(e) => setFormProgress(Number(e.target.value) || 0)}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-secondary"
            />
            <div className="flex justify-between text-[11px] text-primary/50">
              <span>Tahap Desain BIM (0%)</span>
              <span>Struktur &amp; Enclosure (50%)</span>
              <span className="font-bold text-secondary">Handover &amp; Commissioning 2024 (100%)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-outline/60 bg-surface shadow-sm">
        <div className="flex items-center gap-2 border-b border-outline/60 bg-background px-4 py-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-secondary">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M10 9H8" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
          </svg>
          <h3 className="text-lg font-bold text-primary">Description</h3>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="projectDescription" className="text-xs font-bold text-primary">
                Deskripsi Ringkas Landing Page (Bahasa Indonesia) *
              </label>
              <span className="text-[11px] text-primary/50">{formDescription.length} / 1000 karakter</span>
            </div>
            <textarea
              id="projectDescription"
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full rounded-lg border border-outline/60 bg-white p-3.5 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-outline/60 bg-surface shadow-sm">
        <div className="flex items-center gap-2 border-b border-outline/60 bg-background px-4 py-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-secondary">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          <h3 className="text-lg font-bold text-primary">Media Upload</h3>
        </div>
        <div className="space-y-4 p-5">
          <CmsImageSourceSelector
            name="projectImageSource"
            value={image.sourceMode}
            onChange={image.changeSource}
            disabled={busy}
            guidance={CMS_PROJECT_IMAGE_GUIDANCE}
          />

          {image.sourceMode === "upload" ? (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-primary">
                  Media Visual Utama Proyek (Thumbnail)
                </span>
                <span className="text-[11px] text-primary/50">{CMS_IMAGE_FORMAT_HINT}</span>
              </div>
              <div className="relative aspect-[16/9] max-h-72 overflow-hidden rounded-lg border border-outline bg-slate-900">
                {image.previewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image.previewSrc}
                    alt={`Pratinjau media ${formTitle || "proyek"}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-500">
                    <span className="text-xs">Belum ada media.</span>
                  </div>
                )}
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 text-white">
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="rounded-lg bg-secondary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                        Foto Utama Aktif
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  id="projectImageFile"
                  type="file"
                  accept={CMS_IMAGE_ACCEPT_ATTRIBUTE}
                  onChange={handleFileChange}
                  disabled={busy}
                  className="sr-only"
                  aria-label={mode === "add" ? "Pilih gambar proyek" : "Ganti gambar proyek"}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                  <span>{mode === "add" ? "Pilih Gambar" : "Ganti Gambar"}</span>
                </button>
                {image.pendingFile ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={image.clearPending}
                    className="rounded-lg border border-outline/70 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Batalkan
                  </button>
                ) : null}
                {fileInfoLabel ? (
                  <span className="min-w-0 max-w-full truncate text-[11px] text-primary/60">
                    {fileInfoLabel}
                  </span>
                ) : (
                  <span className="text-[11px] text-primary/50">
                    Gambar diunggah saat Anda menekan simpan.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="relative aspect-[16/9] max-h-72 overflow-hidden rounded-lg border border-outline bg-slate-900">
                {image.previewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image.previewSrc}
                    alt={`Pratinjau media ${formTitle || "proyek"}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-500">
                    <span className="text-xs">Belum ada media.</span>
                  </div>
                )}
              </div>
              <div className="mt-3">
                <label htmlFor="projectImageUrl" className="mb-1.5 block text-xs font-bold text-primary">
                  URL Gambar Project <span className="text-red-700">*</span>
                </label>
                <input
                  id="projectImageUrl"
                  type="text"
                  placeholder="misal: /asset/hero/7.jpg atau https://..."
                  value={image.urlValue}
                  onChange={(e) => image.setUrlValue(e.target.value)}
                  disabled={busy}
                  className={textInputClass}
                />
                <p className="mt-1 text-[11px] text-primary/50">
                  Gunakan URL gambar yang sudah ada. Path lokal seperti{" "}
                  <code>/asset/hero/7.jpg</code> tetap didukung.
                </p>
              </div>
            </div>
          )}

          {image.uploading ? (
            <CmsUploadProgress percent={image.uploadPercent} label="Mengunggah gambar proyek..." />
          ) : null}

          <div>
            <label htmlFor="projectImageAlt" className="mb-1.5 block text-xs font-bold text-primary">
              Alt Text Gambar
            </label>
            <input
              id="projectImageAlt"
              type="text"
              placeholder="Deskripsi gambar untuk aksesibilitas."
              value={formImageAlt}
              onChange={(e) => setFormImageAlt(e.target.value)}
              className={textInputClass}
            />
          </div>
        </div>
      </div>

      {formError ?? image.error ? (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700">
          {formError ?? image.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/dashboard/projects"
          aria-disabled={busy}
          onClick={(event) => {
            if (busy) event.preventDefault();
          }}
          className={`rounded-lg border border-outline bg-surface px-5 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-background ${
            busy ? "pointer-events-none opacity-60" : ""
          }`}
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={busy}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-xs font-bold text-white shadow transition-all hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>
            {image.uploading ? "Mengunggah..." : submitting ? "Menyimpan..." : submitLabel}
          </span>
        </button>
      </div>
    </form>
  );
}
