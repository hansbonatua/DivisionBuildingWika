"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CMS_CLIENT_LOGO_GUIDANCE,
  CMS_IMAGE_ACCEPT_ATTRIBUTE,
  CMS_IMAGE_FORMAT_HINT,
  CMS_LOGO_SOURCE_LABELS,
  cmsImageFileExtension,
  formatCmsImageSize,
  type CmsImageSourceType,
} from "@/lib/cms/image-source";
import {
  useCmsImageField,
  type CmsImageSubmission,
} from "@/lib/cms/use-cms-image-field";
import CmsImageSourceSelector from "@/components/dashboard/cms/CmsImageSourceSelector";
import CmsUploadProgress from "@/components/dashboard/cms/CmsUploadProgress";

export type ClientFormValues = {
  name: string;
  shortName: string;
  category: string;
  link: string;
  logoAlt: string;
  status: "active" | "hidden";
  // Resolved by the shared CMS image hook: the page only forwards it to the API.
  logo: CmsImageSubmission;
};

// Initial data carries the text fields only; the logo is described separately
// so the edit page cannot accidentally seed a stale URL into the upload path.
export type ClientFormData = Omit<ClientFormValues, "logo">;

// What the side preview panel renders while the form is being edited.
export type ClientFormLiveValues = {
  name: string;
  shortName: string;
  link: string;
  status: "active" | "hidden";
  previewLogo: string | null;
  logoFormat: string;
};

type ClientFormProps = {
  mode: "add" | "edit";
  initialData?: ClientFormData;
  // Stored logo of the record being edited (absent on create).
  initialImage?: {
    imageUrl: string;
    source: CmsImageSourceType;
    blobPathname: string | null;
  };
  submitLabel: string;
  onSubmit: (values: ClientFormValues) => void | Promise<void>;
  onValuesChange?: (values: ClientFormLiveValues) => void;
};

const STATUS_OPTIONS = [
  { value: "active", label: "Aktif" },
  { value: "hidden", label: "Nonaktif" },
] as const;

const inputClass =
  "w-full rounded border border-outline bg-surface py-2 px-3.5 text-xs font-medium text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary disabled:cursor-not-allowed disabled:opacity-60";

// Checkerboard backdrop so a transparent PNG/WEBP logo is visible on any theme.
const CHECKERBOARD_STYLE = {
  backgroundImage:
    "repeating-conic-gradient(#f1f5f9 0% 25%, #ffffff 0% 50%)",
  backgroundSize: "12px 12px",
} as const;

function formatFromUrl(url: string): string {
  const extension = cmsImageFileExtension(url.split("?")[0] ?? "");
  return extension ? extension.slice(1).toUpperCase() : "IMG";
}

export default function ClientForm({
  mode,
  initialData,
  initialImage,
  submitLabel,
  onSubmit,
  onValuesChange,
}: ClientFormProps) {
  const [formName, setFormName] = useState(initialData?.name ?? "");
  const [formShortName, setFormShortName] = useState(initialData?.shortName ?? "");
  const [formCategory, setFormCategory] = useState(initialData?.category ?? "");
  const [formLink, setFormLink] = useState(initialData?.link ?? "");
  const [formLogoAlt, setFormLogoAlt] = useState(initialData?.logoAlt ?? "");
  const [formStatus, setFormStatus] = useState<"active" | "hidden">(initialData?.status ?? "active");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const busyRef = useRef(false);

  // Shared CMS image state machine (source mode, pending file, upload, cleanup).
  // On create it defaults to Upload Logo; on edit it mirrors the stored source.
  const image = useCmsImageField({
    module: "clients",
    initial: initialImage ?? null,
  });

  const busy = image.uploading || submitting;

  const pendingExtension = image.pendingFile
    ? cmsImageFileExtension(image.pendingFile.name)
    : null;
  const logoFormat = pendingExtension
    ? pendingExtension.slice(1).toUpperCase()
    : image.sourceMode === "external"
      ? formatFromUrl(image.urlValue)
      : "UPLOAD";

  useEffect(() => {
    onValuesChange?.({
      name: formName,
      shortName: formShortName,
      link: formLink,
      status: formStatus,
      previewLogo: image.previewSrc || null,
      logoFormat,
    });
  }, [
    formName,
    formShortName,
    formLink,
    formStatus,
    image.previewSrc,
    logoFormat,
    onValuesChange,
  ]);

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
    if (!formName.trim()) {
      setFormError("Lengkapi nama instansi.");
      return;
    }
    setFormError(null);
    busyRef.current = true;

    const submission = await image.resolveSubmission();
    if (!submission) {
      busyRef.current = false;
      return;
    }
    if (
      submission.imageSource === "external" &&
      submission.imageUrl.startsWith("blob:")
    ) {
      // A browser object URL is never persistable — it dies with the page.
      image.setError("Gunakan URL logo yang dapat disimpan.");
      busyRef.current = false;
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: formName.trim(),
        shortName: formShortName.trim(),
        category: formCategory.trim(),
        link: formLink.trim(),
        logoAlt: formLogoAlt.trim(),
        status: formStatus,
        logo: submission,
      });
    } catch (error) {
      // The upload already succeeded but the record was not written: remove the
      // freshly uploaded object so it does not become an orphan.
      await image.cleanupOrphan(submission);
      setFormError(error instanceof Error ? error.message : "Gagal menyimpan data client.");
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
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5 p-5">
      <div>
        <label htmlFor="clientName" className="mb-1.5 block text-xs font-bold text-primary">
          Nama Instansi / Perusahaan <span className="text-red-700">*</span>
        </label>
        <input
          id="clientName"
          type="text"
          placeholder="cth. Kementerian Pekerjaan Umum dan Perumahan Rakyat"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          disabled={busy}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="clientShortName" className="mb-1.5 block text-xs font-bold text-primary">
            Short Name / Nama Singkat
          </label>
          <input
            id="clientShortName"
            type="text"
            placeholder="cth. Kementerian PUPR"
            value={formShortName}
            onChange={(e) => setFormShortName(e.target.value)}
            disabled={busy}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="clientCategory" className="mb-1.5 block text-xs font-bold text-primary">
            Category
          </label>
          <input
            id="clientCategory"
            type="text"
            placeholder="cth. Kementerian RI"
            value={formCategory}
            onChange={(e) => setFormCategory(e.target.value)}
            disabled={busy}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="block text-xs font-bold text-primary">
            Logo Instansi <span className="text-red-700">*</span>
          </span>
          <span className="text-[11px] text-primary/50">{CMS_IMAGE_FORMAT_HINT}</span>
        </div>

        <CmsImageSourceSelector
          name="clientLogoSource"
          label="Sumber Logo"
          labels={CMS_LOGO_SOURCE_LABELS}
          value={image.sourceMode}
          onChange={image.changeSource}
          disabled={busy}
          guidance={CMS_CLIENT_LOGO_GUIDANCE}
        />

        {mode === "edit" && image.hasStoredImage && !image.pendingFile ? (
          <p className="mt-3 text-[11px] font-semibold text-primary/60">
            Logo saat ini
            {image.storedSource === "upload"
              ? " — tersimpan di penyimpanan publik"
              : " — dari URL"}
          </p>
        ) : null}

        <div className="mt-3 flex flex-col items-center gap-4 rounded-lg border border-outline bg-surface p-4 sm:flex-row">
          <div
            className="relative flex h-20 w-36 shrink-0 flex-col items-center justify-center rounded border border-outline/60 p-2 shadow-sm"
            style={CHECKERBOARD_STYLE}
          >
            <div className="flex h-full w-full items-center justify-center overflow-hidden">
              {image.previewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.previewSrc}
                  alt={`Pratinjau logo ${formShortName || formName || "instansi"}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-secondary">
                    <line x1="3" x2="21" y1="22" y2="22" />
                    <line x1="6" x2="6" y1="18" y2="11" />
                    <line x1="10" x2="10" y1="18" y2="11" />
                    <line x1="14" x2="14" y1="18" y2="11" />
                    <line x1="18" x2="18" y1="18" y2="11" />
                    <polygon points="12 2 20 7 4 7" />
                  </svg>
                  <span className="mt-0.5 max-w-full truncate px-1 text-[10px] font-extrabold uppercase tracking-tighter text-primary">
                    {formShortName || formName || "Logo Baru"}
                  </span>
                </div>
              )}
            </div>
            <span className="absolute bottom-1 right-1 rounded bg-background px-1 font-mono text-[9px] text-primary/50">
              {logoFormat}
            </span>
          </div>

          {image.sourceMode === "upload" ? (
            <div className="min-w-0 w-full flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  id="clientLogoFile"
                  type="file"
                  accept={CMS_IMAGE_ACCEPT_ATTRIBUTE}
                  onChange={handleFileChange}
                  disabled={busy}
                  className="sr-only"
                  aria-label={mode === "add" ? "Pilih logo instansi" : "Ganti logo instansi"}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded border border-secondary bg-surface px-3 py-1.5 text-xs font-bold text-secondary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                    <path d="M12 12v9" />
                    <path d="m16 16-4-4-4 4" />
                  </svg>
                  <span>{mode === "add" ? "Pilih Logo" : "Ganti Logo"}</span>
                </button>
                {image.pendingFile ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={image.clearPending}
                    className="inline-flex items-center gap-1 rounded border border-red-700/30 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span>Batalkan</span>
                  </button>
                ) : null}
              </div>
              {fileInfoLabel ? (
                <p className="min-w-0 max-w-full truncate text-[11px] text-primary/60">
                  {fileInfoLabel}
                </p>
              ) : (
                <p className="text-[11px] leading-tight text-primary/50">
                  Logo diunggah ke penyimpanan publik saat Anda menekan simpan.
                </p>
              )}
            </div>
          ) : (
            <div className="min-w-0 w-full flex-1 space-y-2">
              <label htmlFor="clientLogoUrl" className="block text-xs font-bold text-primary">
                URL Logo <span className="text-red-700">*</span>
              </label>
              <input
                id="clientLogoUrl"
                type="text"
                placeholder="misal: /asset/partners/PUPR.png atau https://..."
                value={image.urlValue}
                onChange={(e) => image.setUrlValue(e.target.value)}
                disabled={busy}
                className={inputClass}
              />
              <p className="text-[11px] leading-tight text-primary/50">
                Path lokal seperti <code>/asset/partners/PUPR.png</code> tetap didukung
                (termasuk SVG yang sudah ada).
              </p>
            </div>
          )}
        </div>

        {image.uploading ? (
          <div className="mt-3">
            <CmsUploadProgress percent={image.uploadPercent} label="Mengunggah logo..." />
          </div>
        ) : null}
      </div>

      <div>
        <label htmlFor="clientLogoAlt" className="mb-1.5 block text-xs font-bold text-primary">
          Alt Text Logo
        </label>
        <input
          id="clientLogoAlt"
          type="text"
          placeholder="Deskripsi logo untuk aksesibilitas."
          value={formLogoAlt}
          onChange={(e) => setFormLogoAlt(e.target.value)}
          disabled={busy}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="clientLink" className="mb-1.5 block text-xs font-bold text-primary">
          Link Website Redirect
        </label>
        <div className="relative">
          <input
            id="clientLink"
            type="url"
            placeholder="https://..."
            value={formLink}
            onChange={(e) => setFormLink(e.target.value)}
            disabled={busy}
            className="w-full rounded border border-outline bg-surface py-2 pl-8 pr-3.5 text-xs font-medium text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary disabled:cursor-not-allowed disabled:opacity-60"
          />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/50">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </div>
      </div>

      <div>
        <label htmlFor="clientStatus" className="mb-1.5 block text-xs font-bold text-primary">
          Status <span className="text-red-700">*</span>
        </label>
        <select
          id="clientStatus"
          value={formStatus}
          onChange={(e) => setFormStatus(e.target.value as "active" | "hidden")}
          disabled={busy}
          className={inputClass}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {formError ?? image.error ? (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
          {formError ?? image.error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2 border-t border-outline/40 pt-4">
        <Link
          href="/dashboard/clients"
          aria-disabled={busy}
          onClick={(event) => {
            if (busy) event.preventDefault();
          }}
          className={`rounded border border-outline px-3.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-background ${
            busy ? "pointer-events-none opacity-60" : ""
          }`}
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-secondary px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {image.uploading ? "Mengunggah..." : submitting ? "Menyimpan..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
