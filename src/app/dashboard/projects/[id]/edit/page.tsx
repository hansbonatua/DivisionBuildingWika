"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProjectById } from "@/lib/demo/projects";
import ProjectForm from "@/components/dashboard/projects/ProjectForm";
import ProjectPreview from "@/components/dashboard/projects/ProjectPreview";
import ProjectStatusBadge from "@/components/dashboard/projects/ProjectStatusBadge";

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const project = getProjectById(Number(id));

  if (!project) {
    return (
      <div className="mx-auto max-w-[1520px] space-y-6">
        <div className="border-b border-outline/40 pb-2">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Project</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">Project tidak ditemukan.</p>
          <p className="mt-1 text-xs text-primary/70">ID &quot;{id}&quot; tidak ada pada data demo.</p>
          <Link
            href="/dashboard/projects"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Kembali ke Our Project
          </Link>
        </div>
      </div>
    );
  }

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
          <span className="font-bold text-secondary">Edit Project</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Project</h1>
          <ProjectStatusBadge status={project.status} />
        </div>
        <p className="mt-1 max-w-3xl text-base text-primary/70">
          Project ID #{project.id} — {project.title}. Demo: perubahan tidak disimpan permanen.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <ProjectForm
            mode="edit"
            initialData={project}
            submitLabel="Perbarui Konten Proyek"
            onSubmit={() => router.push("/dashboard/projects")}
          />
        </div>
        <div className="lg:col-span-4 lg:sticky lg:top-4">
          <ProjectPreview
            title={project.title}
            category={project.category}
            location={project.location}
            progress={project.progress}
            image={project.image}
            imageAlt={project.imageAlt}
            icon={project.icon}
          />
        </div>
      </div>
    </div>
  );
}
