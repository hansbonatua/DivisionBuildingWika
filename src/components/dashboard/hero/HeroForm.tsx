"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { HeroSlide } from "@/lib/demo/hero";

export type HeroFormValues = {
  title: string;
  project: string;
  location: string;
  status: "active" | "standby";
  image: string;
  description: string;
  imageAlt: string;
};

type HeroFormProps = {
  mode: "add" | "edit";
  initialData?: HeroSlide;
  submitLabel: string;
  onSubmit: (values: HeroFormValues) => void | Promise<void>;
};

const STATUS_OPTIONS = [
  { value: "active", label: "Aktif" },
  { value: "standby", label: "Standby" },
] as const;

const textInputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary placeholder:text-slate-400 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20";

export default function HeroForm({ mode, initialData, submitLabel, onSubmit }: HeroFormProps) {
  const [formTitle, setFormTitle] = useState(initialData?.title.replace(/^\d+\.\s*/, "") ?? "");
  const [formProject, setFormProject] = useState(initialData?.project ?? "");
  const [formLocation, setFormLocation] = useState(initialData?.location ?? "");
  const [formStatus, setFormStatus] = useState<"active" | "standby">(
    initialData && !initialData.badgeActive ? "standby" : "active",
  );
  const [formImageUrl, setFormImageUrl] = useState(initialData?.image ?? "");
  const [formDescription, setFormDescription] = useState(initialData?.description ?? "");
  const [formImageAlt, setFormImageAlt] = useState(initialData?.imageAlt ?? "");
  const [previewSrc, setPreviewSrc] = useState(initialData?.image ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (previewSrc.startsWith("blob:")) {
      URL.revokeObjectURL(previewSrc);
    }
    // Preview-only: blob URLs are never sent to the API (see handleSubmit).
    setPreviewSrc(URL.createObjectURL(file));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!formTitle.trim() || !formProject.trim() || !formLocation.trim() || !formImageUrl.trim()) {
      setFormError("Lengkapi title, project, location, dan URL gambar hero.");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        title: formTitle.trim(),
        project: formProject.trim(),
        location: formLocation.trim(),
        status: formStatus,
        image: formImageUrl.trim(),
        description: formDescription.trim(),
        imageAlt: formImageAlt.trim(),
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Gagal menyimpan perubahan hero.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <label className="block text-xs font-semibold text-slate-700">
            Gambar Hero (Format Gambar)
          </label>
          <span className="text-[11px] text-slate-500">Rekomendasi rasio: 16:9 atau 1440 × 720 px</span>
        </div>
        <div className="rounded-lg border border-outline/60 bg-background/50 p-3.5 transition-colors hover:border-secondary/40">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-outline/50 bg-slate-900 shadow-sm">
                {previewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewSrc} alt="Hero Preview" className="h-full w-full object-cover" />
                ) : null}
                <div className="absolute inset-0 bg-primary/20" />
              </div>
              <div className="truncate">
                <p className="truncate text-xs font-bold text-primary">
                  {initialData?.fileName ?? "Slide Baru.png"}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Format: PNG • Maks. 5 MB (Dimensi: 1318 × 580 px)
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                className="hidden"
                aria-label={mode === "add" ? "Unggah foto hero" : "Ganti foto hero"}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-md border border-outline/70 bg-white px-3 py-1.5 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-slate-50"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="text-secondary"
                >
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                  <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                  <path d="M12 18v-6" />
                  <path d="m9 15 3 3 3-3" />
                </svg>
                <span>{mode === "add" ? "Unggah Foto" : "Unggah / Ganti Foto"}</span>
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <label htmlFor="heroImageUrl" className="mb-1.5 block text-xs font-semibold text-slate-700">
            URL Gambar Hero <span className="text-red-700">*</span>
          </label>
          <input
            id="heroImageUrl"
            type="text"
            placeholder="misal: /asset/hero/2.jpg atau https://..."
            value={formImageUrl}
            onChange={(e) => setFormImageUrl(e.target.value)}
            className={textInputClass}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Nilai inilah yang tersimpan. Pratinjau file lokal di atas tidak tersimpan (upload storage
            belum tersedia).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="heroTitle" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Judul Slide <span className="text-red-700">*</span>
          </label>
          <input
            id="heroTitle"
            type="text"
            placeholder="misal: Istana Garuda IKN"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            className={textInputClass}
          />
        </div>
        <div>
          <label htmlFor="heroStatus" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Status <span className="text-red-700">*</span>
          </label>
          <select
            id="heroStatus"
            value={formStatus}
            onChange={(e) => setFormStatus(e.target.value as "active" | "standby")}
            className={textInputClass}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="heroProject" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Featured Project <span className="text-red-700">*</span>
          </label>
          <div className="relative rounded-lg border border-outline/60 bg-white shadow-sm transition-all focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="text-secondary"
              >
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
                <path d="M10 6h4" />
                <path d="M10 10h4" />
                <path d="M10 14h4" />
                <path d="M10 18h4" />
              </svg>
            </div>
            <input
              id="heroProject"
              type="text"
              placeholder="misal: ISTANA NEGARA IKN NUSANTARA"
              value={formProject}
              onChange={(e) => setFormProject(e.target.value)}
              className="h-10 w-full rounded-lg border-0 bg-transparent pl-9 pr-3.5 text-xs font-semibold text-primary placeholder:text-slate-400 focus:ring-0"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Tipe: string • Ditampilkan pada label sorotan banner.
          </p>
        </div>
        <div>
          <label htmlFor="heroLocation" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Location <span className="text-red-700">*</span>
          </label>
          <div className="relative rounded-lg border border-outline/60 bg-white shadow-sm transition-all focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="text-secondary"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <input
              id="heroLocation"
              type="text"
              placeholder="misal: Penajam Paser Utara, Nusantara (IKN)"
              value={formLocation}
              onChange={(e) => setFormLocation(e.target.value)}
              className="h-10 w-full rounded-lg border-0 bg-transparent pl-9 pr-3.5 text-xs font-semibold text-primary placeholder:text-slate-400 focus:ring-0"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Tipe: string • Lokasi geografis atau wilayah proyek.
          </p>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="heroDescription" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Deskripsi Singkat
          </label>
          <textarea
            id="heroDescription"
            rows={2}
            placeholder="Ringkasan singkat slide hero."
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            className="w-full rounded-lg border border-outline/60 bg-white px-3.5 py-2.5 text-xs text-primary placeholder:text-slate-400 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="heroImageAlt" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Teks Alt Gambar
          </label>
          <input
            id="heroImageAlt"
            type="text"
            placeholder="Deskripsi gambar untuk aksesibilitas."
            value={formImageAlt}
            onChange={(e) => setFormImageAlt(e.target.value)}
            className={textInputClass}
          />
        </div>
      </div>

      {formError ? (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/dashboard/hero"
          className="rounded-lg border border-outline bg-surface px-5 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-background"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all duration-150 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
          </svg>
          <span>{submitting ? "Menyimpan..." : submitLabel}</span>
        </button>
      </div>
    </form>
  );
}
