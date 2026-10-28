"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  instagramAccounts,
} from "@/lib/demo/social-media";
import {
  CMS_IMAGE_ACCEPT_ATTRIBUTE,
  CMS_SOCIAL_IMAGE_GUIDANCE,
  CMS_SOCIAL_IMAGE_SOURCE_LABELS,
  CMS_SOCIAL_IMAGE_SOURCE_TYPES,
  cmsImageFileExtension,
  formatCmsImageSize,
  type CmsImageSelectionType,
} from "@/lib/cms/image-source";
import { useCmsImageField } from "@/lib/cms/use-cms-image-field";
import CmsImageSourceSelector from "@/components/dashboard/cms/CmsImageSourceSelector";
import CmsUploadProgress from "@/components/dashboard/cms/CmsUploadProgress";

// Curated Instagram feed editor.
//
// The image is OPTIONAL here, so this is the only CMS form with three source
// states: Upload Gambar, URL Gambar, Tanpa Gambar. Upload/URL behaviour comes
// from the shared CMS hook and components (no second state machine); "none"
// simply publishes the card with no image, and the landing renders its
// Instagram glyph.
//
// `url` is the ORIGINAL Instagram post URL — the landing CTA. It is never the
// image source, and nothing is fetched from Instagram.

export type SocialPostFormValues = {
  platform: "instagram";
  account: string;
  caption: string;
  url: string;
  type: string;
  imageAlt: string;
  status: "Published" | "Draft" | "Hidden";
};

export type SocialPostImageValues = {
  imageUrl: string;
  imageSource: CmsImageSelectionType;
  blobPathname: string | null;
};

export type SocialPostFormData = SocialPostFormValues & SocialPostImageValues;

type SocialPostFormProps = {
  mode: "add" | "edit";
  initialData?: SocialPostFormData;
  submitLabel: string;
  onSubmit: (
    values: SocialPostFormValues,
    image: SocialPostImageValues,
  ) => void | Promise<void>;
  // Live mirror for the sidebar preview: the resolved image src ("" = none).
  onValuesChange?: (values: SocialPostFormValues, imageUrl: string) => void;
};

const inputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20";

const buttonClass =
  "rounded-md border border-outline/70 bg-white px-3 py-1.5 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

export default function SocialPostForm({
  mode,
  initialData,
  submitLabel,
  onSubmit,
  onValuesChange,
}: SocialPostFormProps) {
  const [formAccount, setFormAccount] = useState(
    initialData?.account ?? instagramAccounts[0].username,
  );
  const [formCaption, setFormCaption] = useState(initialData?.caption ?? "");
  const [formUrl, setFormUrl] = useState(initialData?.url ?? "");
  const [formType, setFormType] = useState(initialData?.type ?? TYPE_OPTIONS[0]);
  const [formImageAlt, setFormImageAlt] = useState(initialData?.imageAlt ?? "");
  const [formStatus, setFormStatus] = useState<"Published" | "Draft" | "Hidden">(
    initialData?.status ?? "Draft",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const busyRef = useRef(false);

  // Shared CMS image state machine. `allowNone` opts this module into the
  // third, image-free state; every other module keeps the two-source model.
  const image = useCmsImageField({
    module: "social",
    initial: initialData
      ? {
          imageUrl: initialData.imageUrl,
          source: initialData.imageSource,
          blobPathname: initialData.blobPathname,
        }
      : null,
    allowNone: true,
  });

  const busy = image.uploading || submitting;

  const pendingExtension = image.pendingFile
    ? cmsImageFileExtension(image.pendingFile.name)
    : null;

  useEffect(() => {
    onValuesChange?.(
      {
        platform: "instagram",
        account: formAccount,
        caption: formCaption,
        url: formUrl,
        type: formType,
        imageAlt: formImageAlt,
        status: formStatus,
      },
      image.previewSrc,
    );
  }, [
    formAccount,
    formCaption,
    formUrl,
    formType,
    formImageAlt,
    formStatus,
    image.previewSrc,
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
    if (!formAccount.trim() || !formUrl.trim()) {
      setFormError("Lengkapi account dan URL postingan Instagram.");
      return;
    }
    setFormError(null);
    busyRef.current = true;

    const submission = await image.resolveSubmission();
    if (!submission) {
      busyRef.current = false;
      return;
    }
    if (submission.imageSource === "external" && submission.imageUrl.startsWith("blob:")) {
      // A browser object URL is never persistable — it dies with the page.
      image.setError("Gunakan URL gambar yang dapat disimpan.");
      busyRef.current = false;
      return;
    }

    setSubmitting(true);
    const imageValues: SocialPostImageValues = {
      imageUrl: submission.imageUrl,
      imageSource: submission.imageSource,
      blobPathname: submission.blobPathname,
    };
    try {
      await onSubmit(
        {
          platform: "instagram",
          account: formAccount,
          caption: formCaption.trim(),
          url: formUrl.trim(),
          type: formType,
          imageAlt: formImageAlt.trim(),
          status: formStatus,
        },
        imageValues,
      );
    } catch (error) {
      // The upload already succeeded but the record was not written: remove the
      // freshly uploaded object so it does not become an orphan.
      await image.cleanupOrphan(submission);
      setFormError(
        error instanceof Error ? error.message : "Gagal menyimpan postingan.",
      );
    } finally {
      setSubmitting(false);
      busyRef.current = false;
    }
  }

  const errorText = formError ?? image.error;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
      <div className="space-y-3 md:col-span-2">
        <CmsImageSourceSelector
          name="social-image-source"
          value={image.sourceMode}
          onChange={image.changeSource}
          guidance={CMS_SOCIAL_IMAGE_GUIDANCE}
          labels={CMS_SOCIAL_IMAGE_SOURCE_LABELS}
          options={CMS_SOCIAL_IMAGE_SOURCE_TYPES}
          disabled={busy}
        />

        {image.sourceMode === "none" ? (
          <p
            className="rounded-lg border border-dashed border-outline bg-background/40 px-3.5 py-3 text-xs font-medium text-primary/70"
            data-testid="social-no-image-note"
          >
            Postingan akan ditampilkan tanpa gambar dan menggunakan ikon Instagram.
          </p>
        ) : image.sourceMode === "upload" ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-outline/60 bg-slate-100">
              {image.previewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.previewSrc}
                  alt="Pratinjau gambar postingan"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-primary/40">
                  Tanpa gambar
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={CMS_IMAGE_ACCEPT_ATTRIBUTE}
                onChange={handleFileChange}
                disabled={busy}
                className="sr-only"
                aria-label={mode === "add" ? "Pilih gambar postingan" : "Ganti gambar postingan"}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className={buttonClass}
              >
                {image.previewSrc ? "Ganti Gambar" : "Pilih Gambar"}
              </button>
              {image.pendingFile ? (
                <button
                  type="button"
                  onClick={() => image.clearPending()}
                  disabled={busy}
                  className={buttonClass}
                >
                  Batalkan
                </button>
              ) : null}
              {image.pendingFile ? (
                <p className="w-full truncate text-[11px] text-slate-500">
                  {image.pendingFile.name} • {formatCmsImageSize(image.pendingFile.size)}
                  {pendingExtension ? ` • ${pendingExtension.slice(1).toUpperCase()}` : ""}
                </p>
              ) : image.hasStoredImage ? (
                <p className="w-full truncate text-[11px] text-slate-500">
                  Gambar saat ini •{" "}
                  {image.currentFileInfo?.name ?? "Gambar tersimpan"}
                </p>
              ) : (
                <p className="w-full text-[11px] text-slate-400">
                  Pilih JPG, PNG, WEBP, atau AVIF (maksimal 5 MB).
                </p>
              )}
              {image.uploading ? (
                <div className="w-full">
                  <CmsUploadProgress percent={image.uploadPercent} />
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-outline/60 bg-slate-100">
              {image.previewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.previewSrc}
                  alt="Pratinjau gambar postingan"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-primary/40">
                  Tanpa gambar
                </span>
              )}
            </div>
            <div className="flex-1">
              <label
                htmlFor="s_imageUrl"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                URL Gambar
              </label>
              <input
                id="s_imageUrl"
                type="text"
                placeholder="misal: /asset/hero/8.jpg atau https://..."
                value={image.urlValue}
                onChange={(e) => image.setUrlValue(e.target.value)}
                disabled={busy}
                className={inputClass}
              />
              <p className="mt-1.5 text-[11px] text-slate-400">
                Gambar yang tampil di landing WIBEX, bukan URL postingan Instagram.
              </p>
            </div>
          </div>
        )}

        {image.sourceMode === "none" ? null : (
          <div>
            <label htmlFor="s_imageAlt" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Alt Text Gambar
            </label>
            <input
              id="s_imageAlt"
              type="text"
              placeholder="Deskripsi gambar untuk aksesibilitas."
              value={formImageAlt}
              onChange={(e) => setFormImageAlt(e.target.value)}
              disabled={busy}
              className={inputClass}
            />
          </div>
        )}
      </div>
      <div>
        <label htmlFor="s_account" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Instagram Account <span className="text-red-700">*</span>
        </label>
        <select id="s_account" value={formAccount} onChange={(e) => setFormAccount(e.target.value)} className={inputClass}>
          {instagramAccounts.map((account) => (
            <option key={account.username} value={account.username}>
              {account.username} — {account.description}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="s_url" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Instagram URL <span className="text-red-700">*</span>
        </label>
        <input
          id="s_url"
          type="url"
          placeholder="https://instagram.com/p/..."
          value={formUrl}
          onChange={(e) => setFormUrl(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1.5 text-[11px] text-slate-400">
          Tautan postingan asli Instagram — tombol &quot;Lihat di Instagram&quot; di landing.
        </p>
      </div>
      <div className="md:col-span-2">
        <label htmlFor="s_caption" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Caption
        </label>
        <textarea
          id="s_caption"
          rows={3}
          value={formCaption}
          onChange={(e) => setFormCaption(e.target.value)}
          className="w-full rounded-lg border border-outline/60 bg-white px-3.5 py-2.5 text-xs text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
        />
      </div>
      <div>
        <label htmlFor="s_type" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Content Type
        </label>
        <select id="s_type" value={formType} onChange={(e) => setFormType(e.target.value)} className={inputClass}>
          {TYPE_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="s_status" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Publish Status
        </label>
        <select
          id="s_status"
          value={formStatus}
          onChange={(e) => setFormStatus(e.target.value as "Published" | "Draft" | "Hidden")}
          className={inputClass}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
      {errorText ? (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700 md:col-span-2">
          {errorText}
        </p>
      ) : null}
      <div className="mt-2 flex items-center justify-end gap-3 border-t border-outline pt-2 md:col-span-2">
        <Link
          href="/dashboard/social-media"
          className="rounded-lg border border-outline bg-white px-4 py-2.5 text-xs font-bold text-primary/70 hover:bg-slate-50"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-secondary px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {image.uploading ? "Mengunggah..." : submitting ? "Menyimpan..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
