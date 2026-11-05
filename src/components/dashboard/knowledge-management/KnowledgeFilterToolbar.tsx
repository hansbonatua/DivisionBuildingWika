"use client";

import KnowledgeProjectCombobox from "@/components/dashboard/knowledge-management/KnowledgeProjectCombobox";
import {
  type KnowledgeFilters,
  type KnowledgeProjectOptionDto,
} from "@/components/dashboard/knowledge-management/types";

// Controlled toolbar for the two client-side filters. No fetching and no state:
// KnowledgeTable owns the filter state (design OD-01/OD-02) and passes derived
// options from the records already loaded by the list API.

const controlClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3 text-xs font-bold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";

export default function KnowledgeFilterToolbar({
  years,
  projects,
  filters,
  resultCount,
  totalCount,
  disabled = false,
  onChange,
  onReset,
}: {
  years: number[];
  projects: KnowledgeProjectOptionDto[];
  filters: KnowledgeFilters;
  resultCount: number;
  totalCount: number;
  disabled?: boolean;
  onChange: (next: KnowledgeFilters) => void;
  onReset: () => void;
}) {
  const selectedProject =
    projects.find((project) => project.project_id === filters.projectId) ?? null;
  const hasActiveFilter = filters.year !== null || filters.projectId !== null;

  return (
    <section
      aria-label="Filter Knowledge Management"
      className="rounded-xl border border-outline/60 bg-background/40 p-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="flex min-w-0 flex-col gap-1.5 lg:w-40">
          <span className="text-[11px] font-bold uppercase tracking-wide text-primary/50">
            Tahun
          </span>
          <select
            value={filters.year === null ? "" : String(filters.year)}
            onChange={(event) => {
              const raw = event.target.value;
              onChange({
                ...filters,
                year: raw === "" ? null : Number(raw),
              });
            }}
            disabled={disabled}
            aria-label="Filter Tahun"
            className={controlClass}
          >
            <option value="">Semua tahun</option>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <div className="flex min-w-0 flex-col gap-1.5 lg:w-80">
          <span className="text-[11px] font-bold uppercase tracking-wide text-primary/50">
            Proyek
          </span>
          <KnowledgeProjectCombobox
            mode="local"
            options={projects}
            value={selectedProject}
            allowClear
            disabled={disabled}
            ariaLabel="Filter Master Project"
            placeholder="Semua proyek — cari nama atau lokasi..."
            onChange={(project) =>
              onChange({
                ...filters,
                projectId: project?.project_id ?? null,
              })
            }
          />
        </div>

        <button
          type="button"
          onClick={onReset}
          disabled={disabled || !hasActiveFilter}
          className="h-10 rounded-lg border border-outline bg-white px-4 text-xs font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset filter
        </button>

        <p
          aria-live="polite"
          className="text-[11px] font-semibold text-primary/55 lg:ml-auto lg:pb-2.5"
        >
          Menampilkan {resultCount} dari {totalCount} record
        </p>
      </div>
    </section>
  );
}
