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

export type CertificateFormValues = {
  projectName: string;
  certificationBody: string;
  certificationType: string;
  level: string;
  year: number;
  certificateNumber: string;
  score: number;
  description: string;
  imageUrl: string;
  imageAlt: string;
  status: CertificateVerification;
  publishStatus: CertificatePublish;
};

export type CertificateFormData = CertificateFormValues;

type CertificateFormProps = {
  mode: "add" | "edit";
  initialData?: CertificateFormData;
  submitLabel: string;
  onSubmit: (values: CertificateFormValues) => void | Promise<void>;
  onValuesChange?: (values: CertificateFormValues, previewImage: string | null) => void;
};

const inputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20";

export default function CertificateForm({
  mode,
  initialData,
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
  const [formImageUrl, setFormImageUrl] = useState(initialData?.imageUrl ?? "");
  const [formImageAlt, setFormImageAlt] = useState(initialData?.imageAlt ?? "");
  const [formStatus, setFormStatus] = useState<CertificateVerification>(
    initialData?.status ?? "Verified",
  );
  const [formPublish, setFormPublish] = useState<CertificatePublish>(
    initialData?.publishStatus ?? "Draft",
  );
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentValues: CertificateFormValues = {
    projectName: formProject,
    certificationBody: formBody,
    certificationType: formType,
    level: formLevel,
    year: formYear,
    certificateNumber: formNumber,
    score: formScore,
    description: formDescription,
    imageUrl: formImageUrl,
    imageAlt: formImageAlt,
    status: formStatus,
    publishStatus: formPublish,
  };

  useEffect(() => {
    onValuesChange?.(currentValues, previewFile);
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
    formImageUrl,
    formImageAlt,
    formStatus,
    formPublish,
    previewFile,
  ]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (previewFile?.startsWith("blob:")) {
      URL.revokeObjectURL(previewFile);
    }
    // Preview-only: object URLs are never sent to the API (see handleSubmit).
    setPreviewFile(URL.createObjectURL(file));
  }

  function handleRemovePreview(): void {
    if (previewFile?.startsWith("blob:")) {
      URL.revokeObjectURL(previewFile);
    }
    setPreviewFile(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!formProject.trim() || !formBody.trim() || !formImageUrl.trim()) {
      setFormError("Lengkapi project name, certification body, dan URL gambar.");
      return;
    }
    if (formImageUrl.trim().startsWith("blob:")) {
      setFormError("Gunakan URL gambar yang dapat disimpan. Upload file permanen belum tersedia.");
      return;
    }
    setFormError(null);
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
        imageUrl: formImageUrl.trim(),
        imageAlt: formImageAlt.trim(),
        status: formStatus,
        publishStatus: formPublish,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Gagal menyimpan sertifikat.");
    } finally {
      setSubmitting(false);
    }
  }

  const canvasSrc = previewFile ?? (formImageUrl.startsWith("blob:") ? "" : formImageUrl);

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">
          Certificate Image (JPG/PNG/WebP)
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-outline/60 bg-slate-100">
            {canvasSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={canvasSrc} alt="Preview sertifikat" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="hidden"
              aria-label={mode === "add" ? "Pratinjau foto sertifikat" : "Ganti pratinjau foto"}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-outline/70 bg-white px-3 py-1.5 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-slate-50"
            >
              {mode === "add" ? "Pilih Pratinjau" : "Ganti Pratinjau"}
            </button>
            {previewFile ? (
              <button
                type="button"
                onClick={handleRemovePreview}
                className="rounded-md border border-outline/70 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
              >
                Hapus Pratinjau
              </button>
            ) : null}
            <p className="w-full text-[11px] text-slate-400">
              Pratinjau bersifat lokal dan tidak tersimpan. Yang tersimpan adalah URL di bawah.
            </p>
          </div>
        </div>
        <div className="mt-3">
          <label htmlFor="f_imageUrl" className="mb-1.5 block text-xs font-semibold text-slate-700">
            URL Gambar Sertifikat <span className="text-red-700">*</span>
          </label>
          <input
            id="f_imageUrl"
            type="text"
            placeholder="misal: /asset/hero/7.jpg atau https://..."
            value={formImageUrl}
            onChange={(e) => setFormImageUrl(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="mt-3">
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
      {formError ? (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700 md:col-span-2">
          {formError}
        </p>
      ) : null}
      <div className="mt-2 flex items-center justify-end gap-3 border-t border-outline pt-2 md:col-span-2">
        <Link
          href="/dashboard/green-building"
          className="rounded-lg border border-outline bg-white px-4 py-2.5 text-xs font-bold text-primary/70 hover:bg-slate-50"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-secondary px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Menyimpan..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

export type CertificateVerification = CertificateItem["status"];
export type CertificatePublish = "Draft" | "Published" | "Archived";
