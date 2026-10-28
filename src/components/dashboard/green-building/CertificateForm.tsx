"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  LEVEL_OPTIONS,
  PUBLISH_OPTIONS,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  type CertificateItem,
} from "@/lib/demo/green-building";
import {
  CMS_GREEN_BUILDING_IMAGE_GUIDANCE,
  CMS_IMAGE_ACCEPT_ATTRIBUTE,
  CMS_IMAGE_FORMAT_HINT,
  formatCmsImageSize,
  type CmsImageSourceType,
} from "@/lib/cms/image-source";
import {
  useCmsImageField,
  type CmsImageSubmission,
} from "@/lib/cms/use-cms-image-field";
import CmsImageSourceSelector from "@/components/dashboard/cms/CmsImageSourceSelector";
import CmsUploadProgress from "@/components/dashboard/cms/CmsUploadProgress";

export type CertificateFormValues = {
  projectName: string;
  certificationBody: string;
  certificationType: string;
  level: string;
  year: number;
  certificateNumber: string;
  score: number;
  description: string;
  // Resolved by the shared CMS image hook: the page only forwards it to the API.
  image: CmsImageSubmission;
  imageAlt: string;
  status: CertificateVerification;
  publishStatus: CertificatePublish;
};

// Text fields only (no image): initial data and live-preview values.
export type CertificateFormDraft = Omit<CertificateFormValues, "image">;
export type CertificateFormData = CertificateFormDraft;

type CertificateFormProps = {
  mode: "add" | "edit";
  initialData?: CertificateFormData;
  // Stored image of the record being edited (absent on create).
  initialImage?: {
    imageUrl: string;
    source: CmsImageSourceType;
    blobPathname: string | null;
  };
  submitLabel: string;
  onSubmit: (values: CertificateFormValues) => void | Promise<void>;
  onValuesChange?: (values: CertificateFormDraft, previewImage: string | null) => void;
};

const inputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20";

export default function CertificateForm({
  mode,
  initialData,
  initialImage,
  submitLabel,
  onSubmit,
  onValuesChange,
}: CertificateFormProps) {
  const [formProject, setFormProject] = useState(initialData?.projectName ?? "");
  const [formBody, setFormBody] = useState(
    initialData?.certificationBody ?? "Green Building Council Indonesia",
  );
  const [formType, setFormType] = useState(initialData?.certificationType ?? TYPE_OPTIONS[0]);
  const [formLevel, setFormLevel] = useState(initialData?.level ?? LEVEL_OPTIONS[0]);
  const [formYear, setFormYear] = useState(initialData?.year ?? new Date().getFullYear());
  const [formNumber, setFormNumber] = useState(initialData?.certificateNumber ?? "");
  const [formScore, setFormScore] = useState(initialData?.score ?? 0);
  const [formDescription, setFormDescription] = useState(initialData?.description ?? "");
  const [formImageAlt, setFormImageAlt] = useState(initialData?.imageAlt ?? "");
  const [formStatus, setFormStatus] = useState<CertificateVerification>(
    initialData?.status ?? "Verified",
  );
  const [formPublish, setFormPublish] = useState<CertificatePublish>(
    initialData?.publishStatus ?? "Draft",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const busyRef = useRef(false);

  // Shared CMS image state machine (source mode, pending file, upload, cleanup).
  // On create it defaults to Upload Gambar; on edit it mirrors the stored source.
  const image = useCmsImageField({
    module: "green-building",
    initial: initialImage ?? null,
  });

  const busy = image.uploading || submitting;

  const currentValues: CertificateFormDraft = {
    projectName: formProject,
    certificationBody: formBody,
    certificationType: formType,
    level: formLevel,
    year: formYear,
    certificateNumber: formNumber,
    score: formScore,
    description: formDescription,
    imageAlt: formImageAlt,
    status: formStatus,
    publishStatus: formPublish,
  };

  useEffect(() => {
    onValuesChange?.(currentValues, image.previewSrc ? image.previewSrc : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formProject,
    formBody,
    formType,
    formLevel,
    formYear,
    formNumber,
    formScore,
    formDescription,
    formImageAlt,
    formStatus,
    formPublish,
    image.previewSrc,
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
    if (!formProject.trim() || !formBody.trim()) {
      setFormError("Lengkapi project name dan certification body.");
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
        ...currentValues,
        projectName: formProject.trim(),
        certificationBody: formBody.trim(),
        certificationType: formType,
        level: formLevel,
        year: Number.isFinite(formYear) ? formYear : new Date().getFullYear(),
        certificateNumber: formNumber.trim(),
        score: Number.isFinite(formScore) ? formScore : 0,
        description: formDescription.trim(),
        image: submission,
        imageAlt: formImageAlt.trim(),
        status: formStatus,
        publishStatus: formPublish,
      });
    } catch (error) {
      // The upload already succeeded but the record was not written: remove the
      // freshly uploaded object so it does not become an orphan.
      await image.cleanupOrphan(submission);
      setFormError(error instanceof Error ? error.message : "Gagal menyimpan sertifikat.");
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
    <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
      <div className="space-y-3 md:col-span-2">
        <CmsImageSourceSelector
          name="certificateImageSource"
          value={image.sourceMode}
          onChange={image.changeSource}
          disabled={busy}
          guidance={CMS_GREEN_BUILDING_IMAGE_GUIDANCE}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative aspect-[16/10] w-full max-w-[9rem] shrink-0 overflow-hidden rounded-lg border border-outline/60 bg-slate-100">
            {image.previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.previewSrc}
                alt="Pratinjau gambar sertifikat"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] text-slate-400">
                Belum ada gambar
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {image.sourceMode === "upload" ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  id="f_imageFile"
                  type="file"
                  accept={CMS_IMAGE_ACCEPT_ATTRIBUTE}
                  onChange={handleFileChange}
                  disabled={busy}
                  className="sr-only"
                  aria-label={mode === "add" ? "Pilih gambar sertifikat" : "Ganti gambar sertifikat"}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md border border-outline/70 bg-white px-3 py-1.5 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {mode === "add" ? "Pilih Gambar" : "Ganti Gambar"}
                </button>
                {image.pendingFile ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={image.clearPending}
                    className="rounded-md border border-outline/70 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Batalkan
                  </button>
                ) : null}
              </div>
            ) : null}
            <p className="min-w-0 max-w-full truncate text-[11px] text-slate-400">
              {image.sourceMode === "upload"
                ? (fileInfoLabel ??
                  `${CMS_IMAGE_FORMAT_HINT}. Gambar diunggah saat Anda menekan simpan.`)
                : CMS_IMAGE_FORMAT_HINT}
            </p>
          </div>
        </div>

        {image.sourceMode === "external" ? (
          <div>
            <label htmlFor="f_imageUrl" className="mb-1.5 block text-xs font-semibold text-slate-700">
              URL Gambar Sertifikat <span className="text-red-700">*</span>
            </label>
            <input
              id="f_imageUrl"
              type="text"
              placeholder="misal: /asset/hero/7.jpg atau https://..."
              value={image.urlValue}
              onChange={(e) => image.setUrlValue(e.target.value)}
              disabled={busy}
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
            />
          </div>
        ) : null}

        {image.uploading ? (
          <CmsUploadProgress percent={image.uploadPercent} label="Mengunggah gambar sertifikat..." />
        ) : null}

        <div>
          <label htmlFor="f_imageAlt" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Alt Text Gambar
          </label>
          <input
            id="f_imageAlt"
            type="text"
            placeholder="Deskripsi gambar untuk aksesibilitas."
            value={formImageAlt}
            onChange={(e) => setFormImageAlt(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="f_project" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Project Name <span className="text-red-700">*</span>
        </label>
        <input id="f_project" type="text" value={formProject} onChange={(e) => setFormProject(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="f_body" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Certification Body <span className="text-red-700">*</span>
        </label>
        <input id="f_body" type="text" value={formBody} onChange={(e) => setFormBody(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="f_type" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Certification Type
        </label>
        <select id="f_type" value={formType} onChange={(e) => setFormType(e.target.value)} className={inputClass}>
          {TYPE_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f_level" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Certification Level
        </label>
        <select id="f_level" value={formLevel} onChange={(e) => setFormLevel(e.target.value)} className={inputClass}>
          {LEVEL_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f_year" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Certification Year
        </label>
        <input id="f_year" type="number" min={2000} max={2100} value={formYear} onChange={(e) => setFormYear(Number(e.target.value) || new Date().getFullYear())} className={inputClass} />
      </div>
      <div>
        <label htmlFor="f_number" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Certificate Number
        </label>
        <input id="f_number" type="text" value={formNumber} onChange={(e) => setFormNumber(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="f_score" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Score / Rating
        </label>
        <div className="flex items-center gap-2">
          <input id="f_score" type="number" min={0} max={100} value={formScore} onChange={(e) => setFormScore(Number(e.target.value) || 0)} className={inputClass} />
          <span className="shrink-0 text-xs font-bold text-slate-500">/ 100</span>
        </div>
      </div>
      <div>
        <label htmlFor="f_desc" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Description
        </label>
        <textarea id="f_desc" rows={3} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="w-full rounded-lg border border-outline/60 bg-white px-3.5 py-2.5 text-xs text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20" />
      </div>
      <div>
        <label htmlFor="f_status" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Verification Status
        </label>
        <select id="f_status" value={formStatus} onChange={(e) => setFormStatus(e.target.value as CertificateFormValues["status"])} className={inputClass}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-400">Status verifikasi, bukan visibilitas publik.</p>
      </div>
      <div>
        <label htmlFor="f_publish" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Publish Status
        </label>
        <select id="f_publish" value={formPublish} onChange={(e) => setFormPublish(e.target.value as CertificateFormValues["publishStatus"])} className={inputClass}>
          {PUBLISH_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-400">Hanya Published yang tampil di landing page.</p>
      </div>
      {formError ?? image.error ? (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700 md:col-span-2">
          {formError ?? image.error}
        </p>
      ) : null}
      <div className="mt-2 flex items-center justify-end gap-3 border-t border-outline pt-2 md:col-span-2">
        <Link
          href="/dashboard/green-building"
          aria-disabled={busy}
          onClick={(event) => {
            if (busy) event.preventDefault();
          }}
          className={`rounded-lg border border-outline bg-white px-4 py-2.5 text-xs font-bold text-primary/70 hover:bg-slate-50 ${
            busy ? "pointer-events-none opacity-60" : ""
          }`}
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

export type CertificateVerification = CertificateItem["status"];
export type CertificatePublish = "Draft" | "Published" | "Archived";
