"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { INTERVAL_OPTIONS } from "@/lib/demo/hero";
import HeroTable from "@/components/dashboard/hero/HeroTable";
import type { HeroApiItem } from "@/components/dashboard/hero/hero-api.types";

export default function HeroIndexPage() {
  const [heroes, setHeroes] = useState<HeroApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState(INTERVAL_OPTIONS[0]);

  async function loadHeroes(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/heroes");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const body = (await response.json()) as { data?: HeroApiItem[] };
      setHeroes(Array.isArray(body.data) ? body.data : []);
    } catch {
      setError("Gagal memuat data hero.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHeroes();
  }, []);

  async function handleDelete(id: string): Promise<void> {
    setError(null);
    try {
      const response = await fetch(`/api/heroes/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setHeroes((prev) => prev.filter((hero) => hero._id !== id));
    } catch {
      setError("Gagal menghapus data hero.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
              Landing Page Content Engine
            </span>
            <span className="text-xs text-primary/50">•</span>
            <span className="text-xs text-primary/50">Versi Produksi Live v4.8</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Manajemen Konten Landing Page Publik
          </h1>
          <p className="max-w-3xl text-base text-primary/70">
            Kelola teks, foto banner hero, statistik capaian, dan visibilitas seksi landing page utama PT Wijaya
            Karya (Persero) Tbk. Divisi Building.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/dashboard/hero/add"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all duration-150 hover:bg-secondary"
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
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            <span>Tambah Slide</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-outline bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="block text-xs font-bold text-primary">Pengaturan Rotasi Otomatis</span>
          <span className="text-[11px] text-primary/70">Interval rotasi hero slider landing page.</span>
        </div>
        <label className="flex items-center gap-2 text-xs text-primary/70">
          <span>Interval Tayang:</span>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            aria-label="Interval Tayang"
            className="rounded border border-outline bg-white px-2 py-1.5 text-xs font-semibold text-primary focus:border-secondary focus:outline-none"
          >
            {INTERVAL_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Memuat data hero...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">{error}</p>
          <button
            type="button"
            onClick={() => void loadHeroes()}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      ) : heroes.length === 0 ? (
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Belum ada slide hero.</p>
        </div>
      ) : (
        <HeroTable heroes={heroes} onDelete={(id) => void handleDelete(id)} />
      )}
    </div>
  );
}
