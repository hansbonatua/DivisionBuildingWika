"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import HeroForm, { type HeroFormValues } from "@/components/dashboard/hero/HeroForm";

export default function AddHeroPage() {
  const router = useRouter();

  async function handleCreate(values: HeroFormValues): Promise<void> {
    const response = await fetch("/api/heroes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: values.title,
        projectName: values.project,
        location: values.location,
        status: values.status,
        // The image is already in the public CMS store when it was uploaded;
        // the API re-verifies the object before writing this row.
        imageUrl: values.image.imageUrl,
        imageSource: values.image.imageSource,
        blobPathname: values.image.blobPathname,
        description: values.description,
        imageAlt: values.imageAlt,
      }),
    });
    if (!response.ok) {
      let message = "Gagal menambahkan hero.";
      try {
        const body = (await response.json()) as { error?: { message?: string } };
        if (body.error?.message) {
          message = body.error.message;
        }
      } catch {
        /* keep default message */
      }
      throw new Error(message);
    }
    router.push("/dashboard/hero");
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-outline pb-4">
        <nav className="mb-2 flex items-center gap-2 text-[11px] text-primary/50" aria-label="Breadcrumb">
          <Link href="/dashboard/hero" className="transition-colors hover:text-secondary">
            Hero Banner
          </Link>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className="font-bold text-secondary">Tambah Slide</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Tambah Slide Hero</h1>
        <p className="mt-1 max-w-3xl text-base text-primary/70">
          Buat slide hero baru untuk landing page WIBEX. Gambar dapat diunggah langsung atau dipakai
          dari URL yang sudah ada.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm">
        <div className="border-b border-outline p-5">
          <HeroForm mode="add" submitLabel="Simpan Slide" onSubmit={handleCreate} />
        </div>
      </div>
    </div>
  );
}
