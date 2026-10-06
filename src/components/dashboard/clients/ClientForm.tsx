"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type ClientFormValues = {
  name: string;
  shortName: string;
  category: string;
  link: string;
  logoUrl: string;
  logoAlt: string;
  status: "active" | "hidden";
};

export type ClientFormData = {
  name: string;
  shortName: string;
  category: string;
  link: string;
  logoUrl: string;
  logoAlt: string;
  status: "active" | "hidden";
};

type ClientFormProps = {
  mode: "add" | "edit";
  initialData?: ClientFormData;
  submitLabel: string;
  onSubmit: (values: ClientFormValues) => void | Promise<void>;
  onValuesChange?: (values: ClientFormValues & { previewLogo: string | null }) => void;
};

const STATUS_OPTIONS = [
  { value: "active", label: "Aktif" },
  { value: "hidden", label: "Nonaktif" },
] as const;

const inputClass =
  "w-full rounded border border-outline bg-surface py-2 px-3.5 text-xs font-medium text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary";

export default function ClientForm({
  mode,
  initialData,
  submitLabel,
  onSubmit,
  onValuesChange,
}: ClientFormProps) {
  const [formName, setFormName] = useState(initialData?.name ?? "");
  const [formShortName, setFormShortName] = useState(initialData?.shortName ?? "");
  const [formCategory, setFormCategory] = useState(initialData?.category ?? "");
  const [formLink, setFormLink] = useState(initialData?.link ?? "");
  const [formLogoUrl, setFormLogoUrl] = useState(initialData?.logoUrl ?? "");
  const [formLogoAlt, setFormLogoAlt] = useState(initialData?.logoAlt ?? "");
  const [formStatus, setFormStatus] = useState<"active" | "hidden">(initialData?.status ?? "active");
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [logoFormat, setLogoFormat] = useState("SVG");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    onValuesChange?.({
      name: formName,
      shortName: formShortName,
      category: formCategory,
      link: formLink,
      logoUrl: formLogoUrl,
      logoAlt: formLogoAlt,
      status: formStatus,
      previewLogo: previewFile,
    });
  }, [formName, formShortName, formCategory, formLink, formLogoUrl, formLogoAlt, formStatus, previewFile, onValuesChange]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (previewFile?.startsWith("blob:")) {
      URL.revokeObjectURL(previewFile);
    }
    setLogoFormat(file.name.split(".").pop()?.toUpperCase() ?? "IMG");
    // Preview-only: object URLs are never sent to the API (see handleSubmit).
    setPreviewFile(URL.createObjectURL(file));
  }

  function handleRemovePreview(): void {
    if (previewFile?.startsWith("blob:")) {
      URL.revokeObjectURL(previewFile);
    }
    setPreviewFile(null);
    setLogoFormat("SVG");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!formName.trim() || !formLogoUrl.trim()) {
      setFormError("Lengkapi nama instansi dan URL logo.");
      return;
    }
    if (formLogoUrl.trim().startsWith("blob:")) {
      setFormError("Gunakan URL logo yang dapat disimpan. Upload file permanen belum tersedia.");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        name: formName.trim(),
        shortName: formShortName.trim(),
        category: formCategory.trim(),
        link: formLink.trim(),
        logoUrl: formLogoUrl.trim(),
        logoAlt: formLogoAlt.trim(),
        status: formStatus,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Gagal menyimpan data client.");
    } finally {
      setSubmitting(false);
    }
  }

  const canvasSrc = previewFile ?? (formLogoUrl.startsWith("blob:") ? "" : formLogoUrl);

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
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold text-primary">
          Logo Instansi (Img-Logo) <span className="text-red-700">*</span>
        </label>
        <div className="flex flex-col items-center gap-4 rounded-lg border border-outline bg-surface p-4 sm:flex-row">
          <div className="relative flex h-20 w-36 flex-col items-center justify-center rounded border border-outline/60 bg-surface p-2 shadow-sm">
            <div className="flex h-full items-center justify-center overflow-hidden">
              {canvasSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={canvasSrc} alt="Pratinjau logo" className="h-full w-full object-contain" />
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
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.svg,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
                aria-label={mode === "add" ? "Unggah logo instansi" : "Ganti logo instansi"}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded border border-secondary bg-surface px-3 py-1.5 text-xs font-bold text-secondary transition-colors hover:bg-background"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                  <path d="M12 12v9" />
                  <path d="m16 16-4-4-4 4" />
                </svg>
                <span>{mode === "add" ? "Unggah Logo" : "Unggah / Ganti Logo"}</span>
              </button>
              <button
                type="button"
                onClick={handleRemovePreview}
                className="inline-flex items-center gap-1 rounded border border-red-700/30 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Hapus</span>
              </button>
            </div>
            <p className="text-[11px] leading-tight text-primary/50">
              Format yang didukung: PNG, SVG, JPG (Rekomendasi 400x160 px, Max 1.5MB). Pratinjau file
              bersifat lokal; yang tersimpan adalah URL di bawah.
            </p>
          </div>
        </div>
        <div className="mt-3">
          <label htmlFor="clientLogoUrl" className="mb-1.5 block text-xs font-bold text-primary">
            URL Logo <span className="text-red-700">*</span>
          </label>
          <input
            id="clientLogoUrl"
            type="text"
            placeholder="misal: /asset/partners/PUPR.png atau https://..."
            value={formLogoUrl}
            onChange={(e) => setFormLogoUrl(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="mt-3">
          <label htmlFor="clientLogoAlt" className="mb-1.5 block text-xs font-bold text-primary">
            Alt Text Logo
          </label>
          <input
            id="clientLogoAlt"
            type="text"
            placeholder="Deskripsi logo untuk aksesibilitas."
            value={formLogoAlt}
            onChange={(e) => setFormLogoAlt(e.target.value)}
            className={inputClass}
          />
        </div>
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
            className="w-full rounded border border-outline bg-surface py-2 pl-8 pr-3.5 text-xs font-medium text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
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
          className={inputClass}
        >
          <option value="active">Aktif</option>
          <option value="hidden">Nonaktif</option>
        </select>
      </div>

      {formError ? (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
          {formError}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2 border-t border-outline/40 pt-4">
        <Link
          href="/dashboard/clients"
          className="rounded border border-outline px-3.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-background"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-secondary px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Menyimpan..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
