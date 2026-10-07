"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProjectTable from "@/components/dashboard/projects/ProjectTable";
import type { PortfolioProjectApiItem } from "@/components/dashboard/projects/portfolio-project-api.types";

export default function ProjectsIndexPage() {
  const [projects, setProjects] = useState<PortfolioProjectApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadProjects(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/portfolio-projects");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const body = (await response.json()) as { data?: PortfolioProjectApiItem[] };
      setProjects(Array.isArray(body.data) ? body.data : []);
    } catch {
      setError("Gagal memuat data project.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  async function handleDelete(id: string): Promise<void> {
    if (deletingId !== null) {
      return;
    }
    setDeletingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/portfolio-projects/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setProjects((prev) => prev.filter((project) => project._id !== id));
    } catch {
      setError("Gagal menghapus project.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1520px] space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline/40 pb-2 md:flex-row md:items-center">
        <div>
          <nav className="mb-2 flex items-center gap-2 text-[11px] text-primary/50" aria-label="Breadcrumb">
            <span>Landing Page CMS</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
            <span>Menu Konten</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
            <span className="font-bold text-secondary">Our Project</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-primary">Manajemen Our Project</h1>
            <span className="rounded border border-secondary/20 bg-background px-2 py-0.5 text-xs font-semibold text-secondary">
              {projects.length} Project
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-base text-primary/70">
            Kelola daftar project yang tampil pada landing page WIBEX.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/projects/add"
            className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all duration-150 hover:bg-primary active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v8" />
              <path d="M8 12h8" />
            </svg>
            <span>+ Tambah Proyek Baru</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-outline/60 bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Memuat data project...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-outline/60 bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">{error}</p>
          <button
            type="button"
            onClick={() => void loadProjects()}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-outline/60 bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Belum ada data project.</p>
        </div>
      ) : (
        <ProjectTable
          projects={projects}
          deletingId={deletingId}
          onDelete={(id) => void handleDelete(id)}
        />
      )}
    </div>
  );
}
