"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ProgramKerjaTable, { type ProgramKerjaTableRow } from "@/components/dashboard/program-kerja/ProgramKerjaTable";
import { canManageProgramKerja } from "@/lib/program-kerja/access";

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
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const canManage = currentUser !== null && canManageProgramKerja(currentUser.role);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    function handlePointerDown(event: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

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
    void loadCurrentUser();
  }, []);

  async function loadCurrentUser(): Promise<void> {
    try {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        return;
      }
      const body = (await response.json()) as { user?: { id?: string; role?: string } };
      if (body.user?.id && body.user?.role) {
        setCurrentUser({ id: body.user.id, role: body.user.role });
      }
    } catch {
      /* table RI editing simply stays read-only; server rules stay authoritative */
    }
  }

  async function refreshPrograms(): Promise<void> {
    const response = await fetch("/api/program-kerja");
    if (!response.ok) {
      throw new Error("Gagal memuat ulang data.");
    }
    const body = (await response.json()) as { data?: ProgramKerjaListItem[] };
    setPrograms(Array.isArray(body.data) ? body.data : []);
  }

  async function readErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) {
        return body.error.message;
      }
    } catch {
      /* keep fallback */
    }
    return fallback;
  }

  async function handleDelete(id: string): Promise<void> {
    setActionError(null);
    const response = await fetch(`/api/program-kerja/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const message = await readErrorMessage(response, "Gagal menghapus Program Kerja.");
      setActionError(message);
      throw new Error(message);
    }
    try {
      await refreshPrograms();
    } catch {
      setActionError("Program terhapus, tetapi gagal memuat ulang data.");
    }
  }

  async function handleSaveRi(programId: string, month: number, ri: number): Promise<void> {
    const response = await fetch(`/api/program-kerja/${programId}/ri`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, ri }),
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Gagal menyimpan RI."));
    }
    await refreshPrograms();
  }

  async function handleSaveNote(programId: string, note: string): Promise<void> {
    const response = await fetch(`/api/program-kerja/${programId}/note`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Gagal menyimpan catatan."));
    }
    await refreshPrograms();
  }

  async function handleSaveEvidence(programId: string, url: string): Promise<void> {
    const response = await fetch(`/api/program-kerja/${programId}/evidence`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evidenceUrl: url }),
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Gagal menyimpan evidence."));
    }
    await refreshPrograms();
  }

  async function buildPdfModule() {
    const module = await import(
      "@/components/dashboard/program-kerja/programKerjaExportPdf"
    );
    const groupName =
      availableGroups.find((group) => group.id === groupFilter)?.name ?? "";
    const meta = {
      yearFilter,
      groupFilterName: groupName,
      unitFilter,
      search,
    };
    const logoDataUrl = await module.loadWibexLogoDataUrl();
    return { module, meta, logoDataUrl };
  }

  async function handleViewPdf(): Promise<void> {
    if (exporting || rows.length === 0) {
      return;
    }
    setExporting(true);
    setMenuOpen(false);
    try {
      const { module, meta, logoDataUrl } = await buildPdfModule();
      module.viewProgramKerjaPdf(rows, meta, logoDataUrl);
    } catch {
      setActionError("Gagal menyiapkan pratinjau PDF.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDownloadPdf(): Promise<void> {
    if (exporting || rows.length === 0) {
      return;
    }
    setExporting(true);
    setMenuOpen(false);
    try {
      const { module, meta, logoDataUrl } = await buildPdfModule();
      module.downloadProgramKerjaPdf(rows, meta, logoDataUrl);
    } catch {
      setActionError("Gagal mengunduh PDF.");
    } finally {
      setExporting(false);
    }
  }

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
        picIds: program.pics.map((pic) => pic.id),
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
          <div ref={menuRef} className="relative">
            <button
              type="button"
              disabled={exporting || rows.length === 0}
              title={rows.length === 0 ? "Tidak ada data untuk diekspor" : "PDF"}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Menu PDF"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-lg border border-outline bg-white px-5 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
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
              <span>{exporting ? "Menyiapkan PDF..." : "PDF"}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={`transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {menuOpen ? (
              <div
                role="menu"
                aria-label="Menu PDF"
                className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-outline/60 bg-white py-2 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={exporting}
                  onClick={() => void handleViewPdf()}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary disabled:opacity-60"
                >
                  <span>View as PDF</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={exporting}
                  onClick={() => void handleDownloadPdf()}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary disabled:opacity-60"
                >
                  <span>Download PDF</span>
                </button>
              </div>
            ) : null}
          </div>
          {canManage ? (
            <Link
              href="/dashboard/program-kerja/manage/new"
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
              <span>Tambah Program</span>
            </Link>
          ) : null}
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
        <>
          {actionError ? (
            <p
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
            >
              {actionError}
            </p>
          ) : null}
          <ProgramKerjaTable
            rows={rows}
            activeYear={yearFilter}
            currentUser={currentUser}
            onDelete={handleDelete}
            onSaveRi={handleSaveRi}
            onSaveNote={handleSaveNote}
            onSaveEvidence={handleSaveEvidence}
          />
        </>
      )}
    </div>
  );
}
