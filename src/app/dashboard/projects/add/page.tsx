"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ProjectForm from "@/components/dashboard/projects/ProjectForm";

export default function AddProjectPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-[1520px] space-y-6">
      <div className="border-b border-outline/40 pb-2">
        <nav className="mb-2 flex items-center gap-2 text-[11px] text-primary/50" aria-label="Breadcrumb">
          <Link href="/dashboard/projects" className="transition-colors hover:text-secondary">
            Our Project
          </Link>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className="font-bold text-secondary">Tambah Project</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Tambah Project</h1>
        <p className="mt-1 max-w-3xl text-base text-primary/70">
          Buat project baru yang tampil pada landing page WIBEX. Demo: data tidak disimpan permanen.
        </p>
      </div>

      <ProjectForm mode="add" submitLabel="Simpan Project" onSubmit={() => router.push("/dashboard/projects")} />
    </div>
  );
}
