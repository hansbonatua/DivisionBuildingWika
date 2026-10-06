"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HeroForm, { type HeroFormValues } from "@/components/dashboard/hero/HeroForm";
import HeroPreview from "@/components/dashboard/hero/HeroPreview";
import HeroStatusBadge from "@/components/dashboard/hero/HeroStatusBadge";
import type { HeroApiItem } from "@/components/dashboard/hero/hero-api.types";
import { shortTitle, type HeroSlide } from "@/lib/demo/hero";

export default function EditHeroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [hero, setHero] = useState<HeroApiItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadHero(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/heroes/${id}`);
      if (response.status === 404) {
        setHero(null);
      } else if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      } else {
        const body = (await response.json()) as { data?: HeroApiItem };
        if (!body.data) {
          throw new Error("Empty response");
        }
        setHero(body.data);
      }
    } catch {
      setError("Gagal memuat data hero.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHero();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Hero Slide</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Memuat data hero...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Hero Slide</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">{error}</p>
          <button
            type="button"
            onClick={() => void loadHero()}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!hero) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Hero Slide</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">Hero slide tidak ditemukan.</p>
          <p className="mt-1 text-xs text-primary/70">ID &quot;{id}&quot; tidak ada pada database.</p>
          <Link
            href="/dashboard/hero"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Kembali ke Hero Banner
          </Link>
        </div>
      </div>
    );
  }

  async function handlePatch(values: HeroFormValues): Promise<void> {
    const response = await fetch(`/api/heroes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: values.title,
        projectName: values.project,
        location: values.location,
        status: values.status,
        imageUrl: values.image,
        description: values.description,
        imageAlt: values.imageAlt,
      }),
    });
    if (!response.ok) {
      let message = "Gagal menyimpan perubahan hero.";
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
  const adapted: HeroSlide = {
    id: 0,
    title: hero.title,
    badge: hero.status === "active" ? hero.title : "STANDBY",
    badgeActive: hero.status === "active",
    description: hero.description,
    image: hero.imageUrl,
    imageAlt: hero.imageAlt,
    fileName: "",
    project: hero.projectName,
    location: hero.location,
  };
  const activeIndex = Math.max(0, hero.sortOrder - 1);
  const total = Math.max(1, hero.sortOrder);

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
          <span className="font-bold text-secondary">Edit Slide</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Hero Slide</h1>
          <HeroStatusBadge badge={adapted.badge} active={adapted.badgeActive} />
        </div>
        <p className="mt-1 max-w-3xl text-base text-primary/70">
          Slide #{activeIndex + 1} ({shortTitle(hero.title)}) — ID #{hero._id}. Demo: perubahan tidak disimpan
          permanen.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm lg:col-span-8">
          <div className="border-b border-outline p-5">
            <HeroForm
              mode="edit"
              initialData={adapted}
              submitLabel="Publish"
              onSubmit={handlePatch}
            />
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm lg:col-span-4 lg:sticky lg:top-4">
          <div className="flex items-center gap-2 border-b border-outline p-4">
            <h2 className="text-lg font-bold text-primary">Preview Slide</h2>
          </div>
          <HeroPreview slide={adapted} activeIndex={activeIndex} total={total} />
        </div>
      </div>
    </div>
  );
}
