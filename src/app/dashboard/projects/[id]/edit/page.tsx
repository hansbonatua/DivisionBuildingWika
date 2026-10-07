"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProjectForm, { type ProjectFormValues } from "@/components/dashboard/projects/ProjectForm";
import ProjectPreview from "@/components/dashboard/projects/ProjectPreview";
import ProjectStatusBadge from "@/components/dashboard/projects/ProjectStatusBadge";
import type { PortfolioProjectApiItem } from "@/components/dashboard/projects/portfolio-project-api.types";

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<PortfolioProjectApiItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadProject(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/portfolio-projects/${id}`);
      if (response.status === 404) {
        setProject(null);
      } else if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      } else {
        const body = (await response.json()) as { data?: PortfolioProjectApiItem };
        if (!body.data) {
          throw new Error("Empty response");
        }
        setProject(body.data);
      }
    } catch {
      setError("Gagal memuat data project.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handlePatch(values: ProjectFormValues): Promise<void> {
    const response = await fetch(`/api/portfolio-projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: values.title,
        category: values.category,
        location: values.location,
        progress: values.progress,
        description: values.description,
        imageUrl: values.imageUrl,
        imageAlt: values.imageAlt,
        status: values.status,
      }),
    });
    if (!response.ok) {
      let message = "Gagal menyimpan perubahan project.";
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
    router.push("/dashboard/projects");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1520px] space-y-6">
        <div className="border-b border-outline/40 pb-2">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Project</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Memuat data project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1520px] space-y-6">
        <div className="border-b border-outline/40 pb-2">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Project</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">{error}</p>
          <button
            type="button"
            onClick={() => void loadProject()}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-[1520px] space-y-6">
        <div className="border-b border-outline/40 pb-2">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Project</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">Project tidak ditemukan.</p>
          <p className="mt-1 text-xs text-primary/70">ID &quot;{id}&quot; tidak ada pada database.</p>
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
          {project.title} — ID #{project._id} (urutan #{project.sortOrder})
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <ProjectForm
            mode="edit"
            initialData={{
              title: project.title,
              category: project.category,
              location: project.location,
              progress: project.progress,
              description: project.description,
              imageUrl: project.imageUrl,
              imageAlt: project.imageAlt,
              status: project.status,
            }}
            submitLabel="Perbarui Konten Proyek"
            onSubmit={handlePatch}
          />
        </div>
        <div className="lg:col-span-4 lg:sticky lg:top-4">
          <ProjectPreview
            title={project.title}
            category={project.category}
            location={project.location}
            progress={project.progress}
            image={project.imageUrl}
            imageAlt={project.imageAlt}
            icon={null}
          />
        </div>
      </div>
    </div>
  );
}
