"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CATEGORY_OPTIONS, type ProjectItem } from "@/lib/demo/projects";

export type ProjectFormValues = {
  name: string;
  category: string;
  location: string;
  progress: number;
  description: string;
  image: string | null;
};

type ProjectFormProps = {
  mode: "add" | "edit";
  initialData?: ProjectItem;
  submitLabel: string;
  onSubmit: (values: ProjectFormValues) => void;
};

export default function ProjectForm({ mode, initialData, submitLabel, onSubmit }: ProjectFormProps) {
  const [formName, setFormName] = useState(initialData?.formName ?? "");
  const [formCategory, setFormCategory] = useState(
    initialData && CATEGORY_OPTIONS.includes(initialData.category)
      ? initialData.category
      : CATEGORY_OPTIONS[0],
  );
  const [formLocation, setFormLocation] = useState(initialData?.formLocation ?? "");
  const [formProgress, setFormProgress] = useState(initialData?.progress ?? 0);
  const [formDescription, setFormDescription] = useState(initialData?.description ?? "");
  const [formImage, setFormImage] = useState<string | null>(
    initialData?.mediaImage ?? initialData?.image ?? null,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setFormImage(URL.createObjectURL(file));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit({
      name: formName,
      category: formCategory,
      location: formLocation,
      progress: formProgress,
      description: formDescription,
      image: formImage,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-sm font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              />
              <span className="mt-1 block text-[11px] text-primary/50">
                Maksimal 60 karakter untuk headline optimal.
              </span>
            </div>
            <div>
              <label htmlFor="projectCategory" className="mb-1.5 block text-xs font-bold text-primary">
                Kategori / Sektor Konstruksi *
              </label>
              <select
                id="projectCategory"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="h-10 w-full rounded-lg border border-outline/60 bg-white px-3 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
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
          </div>

          <div className="space-y-3 rounded-lg border border-outline bg-background/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <label htmlFor="projectProgress" className="block text-xs font-bold text-primary">
                  Status Konstruksi &amp; Milestone Penyelesaian
                </label>
                <p className="text-[11px] text-primary/70">
                  Menampilkan progress bar pada detail modal proyek.
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
              onChange={(e) => setFormProgress(Number(e.target.value))}
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
              <span className="text-[11px] text-primary/50">{formDescription.length} / 250 karakter</span>
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
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-primary">
                  Media Visual Utama Proyek (Thumbnail &amp; Hero Modal)
                </span>
                <p className="text-[11px] text-primary/50">
                  Rekomendasi rasio 16:9, resolusi minimal 2400x1350px (WebP / Ultra-HD JPG maks 5MB).
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label={mode === "add" ? "Unggah foto proyek" : "Ganti foto proyek"}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                  <span>{mode === "add" ? "Unggah Foto" : "Ganti Foto"}</span>
                </button>
              </div>
            </div>
            <div className="group relative aspect-[16/9] max-h-72 overflow-hidden rounded-lg border border-outline bg-slate-900">
              {formImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={formImage} alt={`Pratinjau media ${formName || "proyek"}`} className="h-full w-full object-cover" />
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
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormImage(null)}
                      className="rounded-lg bg-red-600/80 p-2 text-white backdrop-blur transition-colors hover:bg-red-700"
                      title="Hapus Gambar"
                      aria-label="Hapus gambar"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 6h18" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/dashboard/projects"
          className="rounded-lg border border-outline bg-surface px-5 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-background"
        >
          Batal
        </Link>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-xs font-bold text-white shadow transition-all hover:bg-secondary"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{submitLabel}</span>
        </button>
      </div>
    </form>
  );
}
