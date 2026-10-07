"use client";

import Link from "next/link";
import type { PortfolioProjectApiItem } from "@/components/dashboard/projects/portfolio-project-api.types";
import ProjectStatusBadge from "@/components/dashboard/projects/ProjectStatusBadge";
import ProjectThumbIcon from "@/components/dashboard/projects/ProjectThumbIcon";

type ProjectTableProps = {
  projects: PortfolioProjectApiItem[];
  deletingId: string | null;
  onDelete: (id: string) => void;
};

export default function ProjectTable({ projects, deletingId, onDelete }: ProjectTableProps) {
  const rows = [...projects].sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <div className="overflow-hidden rounded-lg border border-outline/60 bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-outline/60 bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-secondary">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18" />
            <path d="M3 15h18" />
          </svg>
          <h2 className="text-lg font-bold text-primary">Project List Management</h2>
        </div>
        <span className="text-xs font-semibold text-primary/70">{projects.length} project</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-xs">
          <thead>
            <tr className="bg-background text-[11px] uppercase tracking-wide text-slate-600">
              <th className="px-3 py-2.5 text-left font-bold">Image</th>
              <th className="px-3 py-2.5 text-left font-bold">Project</th>
              <th className="px-3 py-2.5 text-left font-bold">Category</th>
              <th className="px-3 py-2.5 text-left font-bold">Location</th>
              <th className="px-3 py-2.5 text-left font-bold">Progress</th>
              <th className="px-3 py-2.5 text-left font-bold">Status</th>
              <th className="px-3 py-2.5 text-right font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((project) => (
              <tr key={project._id} className="border-t border-outline/40 hover:bg-background/50">
                <td className="px-3 py-2">
                  {project.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.imageUrl}
                      alt={project.imageAlt || project.title}
                      loading="lazy"
                      className="h-10 w-14 rounded border border-outline/40 object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-14 items-center justify-center rounded border border-outline/40 bg-background text-primary/50">
                      <ProjectThumbIcon icon="building" />
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-bold text-primary">{project.title}</td>
                <td className="whitespace-nowrap px-3 py-2 text-primary/70">{project.category}</td>
                <td className="whitespace-nowrap px-3 py-2 text-primary/70">{project.location}</td>
                <td className="min-w-[140px] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded bg-slate-200">
                      <div className="h-1.5 rounded bg-secondary" style={{ width: `${project.progress}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-primary/70">{project.progress}%</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <ProjectStatusBadge status={project.status} />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <Link
                    href={`/dashboard/projects/${project._id}/edit`}
                    className="rounded px-2.5 py-1 text-xs font-bold text-secondary hover:bg-blue-50"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={deletingId === project._id}
                    onClick={() => onDelete(project._id)}
                    className="rounded px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
