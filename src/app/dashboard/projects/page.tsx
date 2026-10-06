"use client";

import { useState } from "react";
import Link from "next/link";
import { initialProjects } from "@/lib/demo/projects";
import ProjectTable from "@/components/dashboard/projects/ProjectTable";

export default function ProjectsIndexPage() {
  const [projects, setProjects] = useState(initialProjects);

  function handleDelete(id: number): void {
    setProjects((prev) => prev.filter((project) => project.id !== id));
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

      <ProjectTable projects={projects} onDelete={handleDelete} />
    </div>
  );
}
