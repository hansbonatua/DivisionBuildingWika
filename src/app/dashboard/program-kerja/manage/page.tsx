"use client";

import { useEffect, useMemo, useState } from "react";
import ProgramKerjaTable, { type ProgramKerjaTableRow } from "@/components/dashboard/program-kerja/ProgramKerjaTable";

type ProgramKerjaListItem = {
  id: string;
  groupId: string;
  group: { id: string; name: string } | null;
  year: number;
  name: string;
  description: string;
  startMonth: number;
  endMonth: number;
  parameter: string;
  unit: string;
  monitor: string | null;
  note: string | null;
  evidenceUrl: string | null;
  monthly: Array<{ month: number; raValue: number; riValue: number | null }>;
  pics: Array<{ id: string; name: string }>;
};

const inputClass =
  "h-10 rounded-lg border border-outline/60 bg-white px-3 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20";

export default function ProgramKerjaManagePage() {
  const [programs, setPrograms] = useState<ProgramKerjaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");

  async function loadPrograms(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/program-kerja");
      if (response.status === 401 || response.status === 403) {
        throw new Error("UNAUTHORIZED");
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const body = (await response.json()) as { data?: ProgramKerjaListItem[] };
      setPrograms(Array.isArray(body.data) ? body.data : []);
    } catch (err) {
      setError(err instanceof Error && err.message === "UNAUTHORIZED" ? "UNAUTHORIZED" : "Gagal memuat data Program Kerja.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPrograms();
  }, []);

  const availableGroups = useMemo(() => {
    const byId = new Map<string, string>();
    for (const program of programs) {
      if (program.group && !byId.has(program.group.id)) {
        byId.set(program.group.id, program.group.name);
      }
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [programs]);

  const availableYears = useMemo(() => {
    const years = [...new Set(programs.map((program) => program.year))];
    years.sort((a, b) => b - a);
    return years;
  }, [programs]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return programs.filter((program) => {
      if (unitFilter && program.unit !== unitFilter) {
        return false;
      }
      if (yearFilter && String(program.year) !== yearFilter) {
        return false;
      }
      if (groupFilter && program.groupId !== groupFilter) {
        return false;
      }
      if (query) {
        const haystack = [program.name, program.description, program.parameter, program.monitor ?? ""]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [programs, search, groupFilter, yearFilter, unitFilter]);

  const rows: ProgramKerjaTableRow[] = useMemo(
    () =>
      filtered.map((program) => ({
        program: {
          id: program.id,
          name: program.name,
          description: program.description,
          startMonth: program.startMonth,
          endMonth: program.endMonth,
          parameter: program.parameter,
          unit: program.unit,
          monitor: program.monitor,
          note: program.note,
          evidenceUrl: program.evidenceUrl,
          year: program.year,
          groupId: program.groupId,
        },
        monthly: program.monthly,
        picNames: program.pics.map((pic) => pic.name),
        groupName: program.group?.name ?? null,
      })),
    [filtered],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
              Core Enterprise
            </span>
            <span className="text-xs text-primary/50">•</span>
            <span className="text-xs text-primary/50">Kelola Program Kerja</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Kelola Program Kerja</h1>
          <p className="max-w-3xl text-base text-primary/70">
            Kelola rencana, realisasi, PIC, dan monitoring Program Kerja Engineering.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <button
            type="button"
            disabled
            title="Export Excel segera hadir"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-outline bg-white px-5 py-2.5 text-xs font-bold text-slate-400 shadow-sm"
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            <span>Export Excel</span>
          </button>
          <button
            type="button"
            disabled
            title="Tambah Program segera hadir"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-primary/40 px-5 py-2.5 text-xs font-bold text-white shadow-md"
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
            <span>Tambah Program</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-outline bg-surface p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1">
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
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, deskripsi, parameter, monitor..."
            aria-label="Cari Program Kerja"
            className={`${inputClass} w-full pl-9`}
          />
        </div>
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          aria-label="Filter Kelompok Program"
          className={`${inputClass} lg:w-56`}
        >
          <option value="">Semua Kelompok</option>
          {availableGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          aria-label="Filter Tahun"
          className={`${inputClass} lg:w-40`}
        >
          <option value="">Semua Tahun</option>
          {availableYears.map((year) => (
            <option key={year} value={String(year)}>
              {year}
            </option>
          ))}
        </select>
        <select
          value={unitFilter}
          onChange={(e) => setUnitFilter(e.target.value)}
          aria-label="Filter Unit"
          className={`${inputClass} lg:w-40`}
        >
          <option value="">Semua Unit</option>
          <option value="Jumlah">Jumlah</option>
          <option value="Persentase">Persentase</option>
        </select>
      </div>

      {loading ? (
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Memuat data Program Kerja...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">
            {error === "UNAUTHORIZED"
              ? "Anda tidak memiliki akses ke Kelola Program Kerja."
              : error}
          </p>
          <button
            type="button"
            onClick={() => void loadPrograms()}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Belum ada data Program Kerja.</p>
        </div>
      ) : (
        <ProgramKerjaTable rows={rows} activeYear={yearFilter} />
      )}
    </div>
  );
}
