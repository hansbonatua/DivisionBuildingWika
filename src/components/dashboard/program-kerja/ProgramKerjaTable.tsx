"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { HEAD_OFFICE_ROLE } from "@/lib/users/roles";

// Kelola Program Kerja table with inline mutations (Delete, RI, note,
// evidence) via page-provided callbacks. The table owns editing state keyed
// by program/month; the page owns fetching and error banners. Backend is
// the final authority — 403s surface inline and prior values are kept.

export type ProgramKerjaTableMonth = {
  month: number;
  raValue: number;
  riValue: number | null;
};

export type ProgramKerjaTableRow = {
  program: {
    id: string;
    name: string;
    description: string;
    startMonth: number;
    endMonth: number;
    parameter: string;
    unit: string;
    monitor: string | null;
    note: string | null;
    evidenceUrl: string | null;
    year: number;
    groupId: string;
  };
  monthly: ProgramKerjaTableMonth[];
  picIds: string[];
  picNames: string[];
  groupName: string | null;
};

export type ProgramKerjaTableUser = {
  id: string;
  role: string;
};

export const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const MONTH_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const QUARTERS: Array<{ label: string; months: number[] }> = [
  { label: "Quarter I", months: [1, 2, 3] },
  { label: "Quarter II", months: [4, 5, 6] },
  { label: "Quarter III", months: [7, 8, 9] },
  { label: "Quarter IV", months: [10, 11, 12] },
];

// 7 fixed columns + Label + 12 months + 6 trailing columns.
const TOTAL_COLUMNS = 7 + 1 + 12 + 6;

function isOutsidePeriod(month: number, startMonth: number, endMonth: number): boolean {
  return month < startMonth || month > endMonth;
}

export function formatPeriod(startMonth: number, endMonth: number, year: number): string {
  const start = MONTH_LONG[startMonth - 1] ?? `Bulan ${startMonth}`;
  const end = MONTH_LONG[endMonth - 1] ?? `Bulan ${endMonth}`;
  return `${start} – ${end} ${year}`;
}

function monthValue(
  monthly: ProgramKerjaTableMonth[],
  month: number,
): ProgramKerjaTableMonth | undefined {
  return monthly.find((row) => row.month === month);
}

export function totalsFor(unit: string, monthly: ProgramKerjaTableMonth[]): { ra: string; ri: string } {
  if (unit === "Persentase") {
    const ra = monthly.length > 0 ? `${monthly[0].raValue}%` : "—";
    const filled = monthly.filter((row) => row.riValue !== null);
    if (filled.length === 0) {
      return { ra, ri: "—" };
    }
    const avg = filled.reduce((sum, row) => sum + (row.riValue ?? 0), 0) / filled.length;
    return { ra, ri: `${Math.round(avg * 10) / 10}%` };
  }
  const raSum = monthly.reduce((sum, row) => sum + row.raValue, 0);
  const filled = monthly.filter((row) => row.riValue !== null);
  if (monthly.length === 0) {
    return { ra: "—", ri: "—" };
  }
  return { ra: String(raSum), ri: filled.length === 0 ? "—" : String(filled.reduce((sum, row) => sum + (row.riValue ?? 0), 0)) };
}

export function achievementFor(unit: string, monthly: ProgramKerjaTableMonth[]): string {
  const filled = monthly.filter((row) => row.riValue !== null);
  if (monthly.length === 0 || filled.length === 0) {
    return "—";
  }
  if (unit === "Persentase") {
    const avg = filled.reduce((sum, row) => sum + (row.riValue ?? 0), 0) / filled.length;
    return `${Math.round(avg * 10) / 10}%`;
  }
  const raSum = monthly.reduce((sum, row) => sum + row.raValue, 0);
  const riSum = filled.reduce((sum, row) => sum + (row.riValue ?? 0), 0);
  return `${riSum} / ${raSum}`;
}

function yearHeading(rows: ProgramKerjaTableRow[], activeYear: string): string {
  if (activeYear) {
    return `Program Kerja Strategis ${activeYear}`;
  }
  const years = [...new Set(rows.map((row) => row.program.year))];
  if (years.length === 1 && years[0] !== undefined) {
    return `Program Kerja Strategis ${years[0]}`;
  }
  return "Program Kerja Strategis";
}

function groupSections(rows: ProgramKerjaTableRow[]): Array<{ key: string; name: string | null; rows: ProgramKerjaTableRow[] }> {
  const sections = new Map<string, { key: string; name: string | null; rows: ProgramKerjaTableRow[] }>();
  for (const row of rows) {
    const key = row.program.groupId;
    const section = sections.get(key);
    if (section) {
      section.rows.push(row);
    } else {
      sections.set(key, { key, name: row.groupName, rows: [row] });
    }
  }
  return [...sections.values()];
}

const headerCell =
  "border border-outline/40 bg-background px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600";
const monthHeaderCell =
  "border border-outline/40 bg-background px-1 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-600";
const bodyCell = "border border-outline/40 px-3 py-2.5 align-top text-xs";
const monthCell = "border border-outline/40 px-1 py-2 text-center font-mono text-[11px]";
const outsideMonthCell = `${monthCell} bg-green-50/70 text-green-800`;
const emptyCell = `${monthCell} text-slate-300`;

export default function ProgramKerjaTable({
  rows,
  activeYear,
  currentUser,
  onDelete,
  onSaveRi,
  onSaveNote,
  onSaveEvidence,
}: {
  rows: ProgramKerjaTableRow[];
  activeYear: string;
  currentUser: ProgramKerjaTableUser | null;
  onDelete: (programId: string) => Promise<void>;
  onSaveRi: (programId: string, month: number, ri: number) => Promise<void>;
  onSaveNote: (programId: string, note: string) => Promise<void>;
  onSaveEvidence: (programId: string, url: string) => Promise<void>;
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editingRi, setEditingRi] = useState<{ programId: string; month: number; draft: string } | null>(null);
  const [riError, setRiError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<{ programId: string; draft: string } | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [editingEvidence, setEditingEvidence] = useState<{ programId: string; draft: string } | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  function canEditRi(picIds: string[]): boolean {
    return (
      currentUser !== null &&
      currentUser.role === HEAD_OFFICE_ROLE &&
      picIds.includes(currentUser.id)
    );
  }

  async function handleDeleteClick(row: ProgramKerjaTableRow): Promise<void> {
    if (busyKey !== null) {
      return;
    }
    const confirmed = window.confirm(
      `Hapus Program Kerja?\n\n"${row.program.name}" beserta data RA, RI, PIC, catatan, dan evidence terkait akan dihapus.`,
    );
    if (!confirmed) {
      return;
    }
    const key = `${row.program.id}:delete`;
    setBusyKey(key);
    try {
      await onDelete(row.program.id);
    } finally {
      setBusyKey(null);
    }
  }

  function startRiEdit(programId: string, month: number, current: number | null): void {
    if (busyKey !== null) {
      return;
    }
    setRiError(null);
    setEditingRi({ programId, month, draft: current !== null ? String(current) : "" });
  }

  async function saveRi(programId: string, month: number): Promise<void> {
    if (!editingRi || busyKey !== null) {
      return;
    }
    const raw = editingRi.draft.trim();
    if (raw === "") {
      setRiError("Masukkan nilai RI.");
      return;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      setRiError("RI harus angka ≥ 0.");
      return;
    }
    const key = `${programId}:ri:${month}`;
    setBusyKey(key);
    setRiError(null);
    try {
      await onSaveRi(programId, month, value);
      setEditingRi(null);
    } catch (error) {
      setRiError(error instanceof Error ? error.message : "Gagal menyimpan RI.");
    } finally {
      setBusyKey(null);
    }
  }

  function cancelRiEdit(): void {
    setEditingRi(null);
    setRiError(null);
  }

  async function saveNote(programId: string): Promise<void> {
    if (!editingNote || busyKey !== null) {
      return;
    }
    const key = `${programId}:note`;
    setBusyKey(key);
    setNoteError(null);
    try {
      await onSaveNote(programId, editingNote.draft);
      setEditingNote(null);
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "Gagal menyimpan catatan.");
    } finally {
      setBusyKey(null);
    }
  }

  async function saveEvidence(programId: string): Promise<void> {
    if (!editingEvidence || busyKey !== null) {
      return;
    }
    const url = editingEvidence.draft.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      setEvidenceError("URL harus diawali http:// atau https://.");
      return;
    }
    const key = `${programId}:evidence`;
    setBusyKey(key);
    setEvidenceError(null);
    try {
      await onSaveEvidence(programId, url);
      setEditingEvidence(null);
    } catch (error) {
      setEvidenceError(error instanceof Error ? error.message : "Gagal menyimpan evidence.");
    } finally {
      setBusyKey(null);
    }
  }

  const sections = groupSections(rows);
  const numberedSections = sections.map((section) => ({
    ...section,
    rows: section.rows.map((row, index) => ({ row, rowNo: index + 1 })),
  }));
  // Row numbers restart per group section (No column is section-scoped).

  return (
    <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[2100px] border-collapse text-xs">
          <thead>
            <tr>
              <th rowSpan={3} scope="col" className={headerCell}>No</th>
              <th rowSpan={3} scope="col" className={headerCell}>Nama Program Kerja</th>
              <th rowSpan={3} scope="col" className={headerCell}>Deskripsi Program Kerja</th>
              <th rowSpan={3} scope="col" className={headerCell}>Rencana Waktu</th>
              <th rowSpan={3} scope="col" className={headerCell}>Parameter</th>
              <th rowSpan={3} scope="col" className={headerCell}>Total RA &amp; RI Bulan Berjalan</th>
              <th rowSpan={3} scope="col" className={headerCell}>Unit</th>
              <th rowSpan={3} scope="col" className={headerCell}>Label</th>
              <th scope="col" colSpan={12} className={`${headerCell} text-center`}>
                {yearHeading(rows, activeYear)}
              </th>
              <th rowSpan={3} scope="col" className={headerCell}>Pencapaian Total</th>
              <th rowSpan={3} scope="col" className={headerCell}>PIC</th>
              <th rowSpan={3} scope="col" className={headerCell}>Monitor</th>
              <th rowSpan={3} scope="col" className={headerCell}>Catatan</th>
              <th rowSpan={3} scope="col" className={headerCell}>Berkas / Evidence</th>
              <th rowSpan={3} scope="col" className={`${headerCell} text-right`}>Aksi</th>
            </tr>
            <tr>
              {QUARTERS.map((quarter) => (
                <th key={quarter.label} scope="col" colSpan={3} className={`${monthHeaderCell} text-center`}>
                  {quarter.label}
                </th>
              ))}
            </tr>
            <tr>
              {MONTH_SHORT.map((label) => (
                <th key={label} scope="col" className={monthHeaderCell}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {numberedSections.map((section) => (
              <Fragment key={`group-${section.key}`}>
                <tr>
                  <td
                    colSpan={TOTAL_COLUMNS}
                    className="border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
                  >
                    {section.name ?? "Kelompok Program"}
                  </td>
                </tr>
                {section.rows.map(({ row, rowNo }) => {
                  const { program } = row;
                  const totals = totalsFor(program.unit, row.monthly);
                  const achievement = achievementFor(program.unit, row.monthly);
                  const sharedCell = `${bodyCell} border-t-2 border-t-outline/60`;
                  return (
                    <Fragment key={program.id}>
                      <tr key={`${program.id}-ra`} className="hover:bg-background/50">
                        <td rowSpan={2} className={sharedCell}>{rowNo}</td>
                        <td rowSpan={2} className={`${sharedCell} min-w-48 font-bold text-primary`}>
                          {program.name}
                        </td>
                        <td rowSpan={2} className={`${sharedCell} min-w-64`}>
                          <span className="line-clamp-2 block max-w-72 text-primary/70">
                            {program.description || "—"}
                          </span>
                        </td>
                        <td rowSpan={2} className={`${sharedCell} whitespace-nowrap text-primary/70`}>
                          {formatPeriod(program.startMonth, program.endMonth, program.year)}
                        </td>
                        <td rowSpan={2} className={`${sharedCell} text-primary/70`}>
                          {program.parameter}
                        </td>
                        <td rowSpan={2} className={sharedCell}>
                          <div className="text-[11px] font-bold text-primary">RA {totals.ra}</div>
                          <div className="mt-0.5 text-[11px] font-bold text-secondary">RI {totals.ri}</div>
                        </td>
                        <td rowSpan={2} className={sharedCell}>{program.unit}</td>
                        <td className={bodyCell}>
                          <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">
                            RA
                          </span>
                        </td>
                        {MONTH_SHORT.map((_, index) => {
                          const month = index + 1;
                          const cell = monthValue(row.monthly, month);
                          if (!cell) {
                            return (
                              <td key={month} className={emptyCell}>—</td>
                            );
                          }
                          const outside = isOutsidePeriod(month, program.startMonth, program.endMonth);
                          return (
                            <td key={month} className={outside ? outsideMonthCell : monthCell}>
                              {cell.raValue}
                            </td>
                          );
                        })}
                        <td rowSpan={2} className={`${sharedCell} font-bold text-secondary`}>
                          {achievement}
                        </td>
                        <td rowSpan={2} className={`${sharedCell} min-w-32 text-primary/70`}>
                          {row.picNames.length > 0 ? row.picNames.join(", ") : "—"}
                        </td>
                        <td rowSpan={2} className={`${sharedCell} text-primary/70`}>
                          {program.monitor || "—"}
                        </td>
                        <td rowSpan={2} className={`${sharedCell} min-w-40`}>
                          {editingNote?.programId === program.id ? (
                            <div className="flex min-w-44 flex-col items-stretch gap-1.5">
                              <textarea
                                // eslint-disable-next-line jsx-a11y/no-autofocus
                                autoFocus
                                rows={2}
                                value={editingNote.draft}
                                disabled={busyKey !== null}
                                onChange={(e) =>
                                  setEditingNote({ programId: program.id, draft: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") {
                                    setEditingNote(null);
                                    setNoteError(null);
                                  }
                                }}
                                aria-label="Catatan program"
                                className="w-full rounded border border-outline/60 bg-white px-2 py-1 text-xs text-primary focus:border-secondary focus:outline-none"
                              />
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={busyKey !== null}
                                  onClick={() => void saveNote(program.id)}
                                  className="rounded bg-secondary px-2 py-1 text-[11px] font-bold text-white hover:bg-primary disabled:opacity-60"
                                >
                                  {busyKey === `${program.id}:note` ? "Menyimpan..." : "Simpan"}
                                </button>
                                <button
                                  type="button"
                                  disabled={busyKey !== null}
                                  onClick={() => {
                                    setEditingNote(null);
                                    setNoteError(null);
                                  }}
                                  className="rounded border border-outline/60 bg-white px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-60"
                                >
                                  Batal
                                </button>
                              </div>
                              {noteError ? (
                                <span className="text-[11px] font-semibold text-red-600">{noteError}</span>
                              ) : null}
                            </div>
                          ) : (
                            <div className="flex min-w-44 flex-col items-start gap-1.5">
                              <span className="line-clamp-2 block max-w-56 text-primary/70">
                                {program.note || "—"}
                              </span>
                              <button
                                type="button"
                                disabled={busyKey !== null}
                                onClick={() => {
                                  setNoteError(null);
                                  setEditingNote({ programId: program.id, draft: program.note ?? "" });
                                }}
                                className="rounded border border-outline/50 px-2 py-0.5 text-[11px] font-bold text-secondary transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {program.note ? "Ubah" : "Tambah"}
                              </button>
                            </div>
                          )}
                        </td>
                        <td rowSpan={2} className={sharedCell}>
                          {editingEvidence?.programId === program.id ? (
                            <div className="flex min-w-44 flex-col items-stretch gap-1.5">
                              <input
                                // eslint-disable-next-line jsx-a11y/no-autofocus
                                autoFocus
                                type="url"
                                value={editingEvidence.draft}
                                disabled={busyKey !== null}
                                onChange={(e) =>
                                  setEditingEvidence({ programId: program.id, draft: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void saveEvidence(program.id);
                                  } else if (e.key === "Escape") {
                                    setEditingEvidence(null);
                                    setEvidenceError(null);
                                  }
                                }}
                                aria-label="URL evidence"
                                placeholder="https://..."
                                className="w-full rounded border border-outline/60 bg-white px-2 py-1 text-xs text-primary focus:border-secondary focus:outline-none"
                              />
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={busyKey !== null}
                                  onClick={() => void saveEvidence(program.id)}
                                  className="rounded bg-secondary px-2 py-1 text-[11px] font-bold text-white hover:bg-primary disabled:opacity-60"
                                >
                                  {busyKey === `${program.id}:evidence` ? "Menyimpan..." : "Simpan"}
                                </button>
                                <button
                                  type="button"
                                  disabled={busyKey !== null}
                                  onClick={() => {
                                    setEditingEvidence(null);
                                    setEvidenceError(null);
                                  }}
                                  className="rounded border border-outline/60 bg-white px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-60"
                                >
                                  Batal
                                </button>
                              </div>
                              {evidenceError ? (
                                <span className="text-[11px] font-semibold text-red-600">{evidenceError}</span>
                              ) : null}
                            </div>
                          ) : program.evidenceUrl ? (
                            <div className="flex flex-col items-start gap-1.5">
                              <a
                                href={program.evidenceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded border border-outline/50 px-2.5 py-1 text-[11px] font-bold text-secondary transition-colors hover:bg-secondary hover:text-white"
                              >
                                Buka Berkas
                              </a>
                              <button
                                type="button"
                                disabled={busyKey !== null}
                                onClick={() => {
                                  setEvidenceError(null);
                                  setEditingEvidence({ programId: program.id, draft: program.evidenceUrl ?? "" });
                                }}
                                className="rounded px-1 text-[11px] font-bold text-slate-500 hover:text-secondary disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Ubah
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-start gap-1.5">
                              <span className="text-slate-300">—</span>
                              <button
                                type="button"
                                disabled={busyKey !== null}
                                onClick={() => {
                                  setEvidenceError(null);
                                  setEditingEvidence({ programId: program.id, draft: "" });
                                }}
                                className="rounded border border-outline/50 px-2 py-0.5 text-[11px] font-bold text-secondary transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Tambah Link
                              </button>
                            </div>
                          )}
                        </td>
                        <td rowSpan={2} className={`${sharedCell} whitespace-nowrap text-right`}>
                          <Link
                            href={`/dashboard/program-kerja/manage/${program.id}/edit`}
                            className="rounded px-2.5 py-1 text-xs font-bold text-secondary hover:bg-blue-50"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            disabled={busyKey !== null}
                            onClick={() => void handleDeleteClick(row)}
                            title="Hapus Program beserta RA, RI, PIC, catatan, dan evidence"
                            className="rounded px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busyKey === `${program.id}:delete` ? "Menghapus..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                      <tr key={`${program.id}-ri`} className="hover:bg-background/50">
                        <td className={bodyCell}>
                          <span className="inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700">
                            RI
                          </span>
                        </td>
                        {MONTH_SHORT.map((_, index) => {
                          const month = index + 1;
                          const cell = monthValue(row.monthly, month);
                          const riVal = cell?.riValue ?? null;
                          const editable = canEditRi(row.picIds);
                          const isEditing =
                            editingRi?.programId === program.id && editingRi?.month === month;
                          const saving = busyKey === `${program.id}:ri:${month}`;
                          if (!editable) {
                            if (riVal === null) {
                              return (
                                <td key={month} className={emptyCell}>—</td>
                              );
                            }
                            return (
                              <td key={month} className={monthCell}>
                                {riVal}
                              </td>
                            );
                          }
                          if (!isEditing) {
                            return (
                              <td key={month} className={monthCell}>
                                <button
                                  type="button"
                                  title={riVal === null ? "Isi RI" : `Ubah RI (saat ini ${riVal})`}
                                  onClick={() => startRiEdit(program.id, month, riVal)}
                                  className="w-full rounded px-1 py-0.5 hover:bg-blue-50 hover:text-secondary"
                                >
                                  {riVal === null ? <span className="text-slate-300">—</span> : riVal}
                                </button>
                              </td>
                            );
                          }
                          return (
                            <td key={month} className={monthCell}>
                              <div className="flex min-w-20 flex-col items-stretch gap-1">
                                <input
                                  // eslint-disable-next-line jsx-a11y/no-autofocus
                                  autoFocus
                                  type="number"
                                  min={0}
                                  value={editingRi.draft}
                                  disabled={saving}
                                  onChange={(e) =>
                                    setEditingRi({ programId: program.id, month, draft: e.target.value })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      void saveRi(program.id, month);
                                    } else if (e.key === "Escape") {
                                      cancelRiEdit();
                                    }
                                  }}
                                  aria-label={`RI bulan ${MONTH_SHORT[index]}`}
                                  placeholder="—"
                                  className="w-full rounded border border-outline/60 bg-white px-1 py-0.5 text-center font-mono text-[11px] focus:border-secondary focus:outline-none"
                                />
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => void saveRi(program.id, month)}
                                    aria-label="Simpan RI"
                                    className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-primary disabled:opacity-60"
                                  >
                                    {saving ? "…" : "✓"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={cancelRiEdit}
                                    aria-label="Batalkan"
                                    className="rounded border border-outline/60 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-60"
                                  >
                                    ✕
                                  </button>
                                </div>
                                {riError && editingRi?.programId === program.id && editingRi?.month === month ? (
                                  <span className="text-[10px] font-semibold text-red-600">{riError}</span>
                                ) : null}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
