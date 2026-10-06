"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LEVEL_OPTIONS,
  PUBLISH_OPTIONS,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  type CertificateItem,
} from "@/lib/demo/green-building";

export type CertificateFormValues = {
  image: string;
  projectName: string;
  certificationBody: string;
  certificationType: string;
  level: string;
  year: number;
  certificateNumber: string;
  score: number;
  description: string;
  status: CertificateItem["status"];
  expiryDate: string;
  displayOrder: number;
  publishStatus: string;
};

type CertificateFormProps = {
  mode: "add" | "edit";
  initialData?: CertificateItem;
  submitLabel: string;
  onSubmit: (values: CertificateFormValues) => void;
  onImageChange?: (image: string) => void;
  onValuesChange?: (values: CertificateFormValues) => void;
};

const inputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20";

export default function CertificateForm({
  mode,
  initialData,
  submitLabel,
  onSubmit,
  onImageChange,
  onValuesChange,
}: CertificateFormProps) {
  const [formProject, setFormProject] = useState(initialData?.projectName ?? "");
  const [formBody, setFormBody] = useState(
    initialData?.certificationBody ?? "Green Building Council Indonesia",
  );
  const [formType, setFormType] = useState(initialData?.certificationType ?? TYPE_OPTIONS[0]);
  const [formLevel, setFormLevel] = useState(initialData?.level ?? LEVEL_OPTIONS[0]);
  const [formYear, setFormYear] = useState(initialData?.year ?? 2026);
  const [formNumber, setFormNumber] = useState(initialData?.certificateNumber ?? "");
  const [formScore, setFormScore] = useState(initialData?.score ?? 0);
  const [formDescription, setFormDescription] = useState(initialData?.description ?? "");
  const [formStatus, setFormStatus] = useState<CertificateItem["status"]>(
    initialData?.status ?? "Verified",
  );
  const [formExpiry, setFormExpiry] = useState(initialData?.expiryDate ?? "");
  const [formOrder, setFormOrder] = useState(initialData?.displayOrder ?? 1);
  const [formPublish, setFormPublish] = useState(initialData?.publishStatus ?? PUBLISH_OPTIONS[0]);
  const [previewImage, setPreviewImage] = useState(
    initialData?.image ?? "/asset/hero/7.jpg",
  );

  useEffect(() => {
    onValuesChange?.({
      image: previewImage,
      projectName: formProject,
      certificationBody: formBody,
      certificationType: formType,
      level: formLevel,
      year: formYear,
      certificateNumber: formNumber,
      score: formScore,
      description: formDescription,
      status: formStatus,
      expiryDate: formExpiry,
      displayOrder: formOrder,
      publishStatus: formPublish,
    });
  }, [
    previewImage,
    formProject,
    formBody,
    formType,
    formLevel,
    formYear,
    formNumber,
    formScore,
    formDescription,
    formStatus,
    formExpiry,
    formOrder,
    formPublish,
    onValuesChange,
  ]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (previewImage.startsWith("blob:")) {
      URL.revokeObjectURL(previewImage);
    }
    const url = URL.createObjectURL(file);
    setPreviewImage(url);
    onImageChange?.(url);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit({
      image: previewImage,
      projectName: formProject,
      certificationBody: formBody,
      certificationType: formType,
      level: formLevel,
      year: formYear,
      certificateNumber: formNumber,
      score: formScore,
      description: formDescription,
      status: formStatus,
      expiryDate: formExpiry,
      displayOrder: formOrder,
      publishStatus: formPublish,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
      <div>
        <label htmlFor="f_image" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Certificate Image (JPG/PNG/WebP)
        </label>
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-outline/60 bg-slate-100">
            <Image src={previewImage} alt="Preview sertifikat" fill sizes="96px" className="object-cover" />
          </div>
          <div className="flex-1">
            <input
              id="f_image"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border file:border-outline/70 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary hover:file:bg-slate-50"
            />
            <p className="mt-1 text-[11px] text-slate-400">Preview tampil otomatis sebelum save.</p>
          </div>
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
        <input id="f_year" type="number" min={2000} max={2100} value={formYear} onChange={(e) => setFormYear(Number(e.target.value) || 2026)} className={inputClass} />
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
        <select id="f_status" value={formStatus} onChange={(e) => setFormStatus(e.target.value as CertificateItem["status"])} className={inputClass}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f_expiry" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Expiry Date
        </label>
        <input id="f_expiry" type="date" value={formExpiry} onChange={(e) => setFormExpiry(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="f_order" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Display Order
        </label>
        <input id="f_order" type="number" min={1} value={formOrder} onChange={(e) => setFormOrder(Number(e.target.value) || 1)} className={inputClass} />
        <p className="mt-1 text-[11px] text-slate-400">Urutan tampil pada landing page.</p>
      </div>
      <div>
        <label htmlFor="f_publish" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Publish Status
        </label>
        <select id="f_publish" value={formPublish} onChange={(e) => setFormPublish(e.target.value)} className={inputClass}>
          {PUBLISH_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
      <div className="mt-2 flex items-center justify-end gap-3 border-t border-outline pt-2 md:col-span-2">
        <Link
          href="/dashboard/green-building"
          className="rounded-lg border border-outline bg-white px-4 py-2.5 text-xs font-bold text-primary/70 hover:bg-slate-50"
        >
          Batal
        </Link>
        <button
          type="submit"
          className="rounded-lg bg-secondary px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
