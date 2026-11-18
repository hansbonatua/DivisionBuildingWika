"use client";

import { ESG_MONTHS } from "@/lib/esg-assessment/constants";
import type {
  EsgAssessment,
  EsgMonthStatus,
} from "@/components/dashboard/green-building-esg/types";

const EMPTY_VALUE = "\u2014";
const skeletonRows = ["first", "second", "third", "fourth"];

const headerCell =
  "border-b border-outline bg-background px-2 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";
const bodyCell = "border-b border-outline/50 px-2 py-2 align-middle text-xs text-primary/80";

// Empty cells stay plain white with a transparent border. A visible border on
// every empty cell turned the grid into 12 boxes per row; the hover border keeps
// the control discoverable without adding visual noise.
const selectBase =
  "h-8 w-full appearance-none rounded border text-center text-[11px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-secondary/20";

function selectClass(status: EsgMonthStatus | null): string {
  if (status === "Complete") {
    return `${selectBase} border-emerald-300 bg-emerald-100 text-emerald-800`;
  }
  if (status === "Half") {
    return `${selectBase} border-amber-300 bg-amber-100 text-amber-800`;
  }
  return `${selectBase} border-transparent bg-white text-slate-700 hover:border-slate-200`;
}

function displayText(value: string | null | undefined): string {
  return typeof value === "string" && value.trim() !== "" ? value : EMPTY_VALUE;
}

function TableSkeleton() {
  return (
    <>
      {skeletonRows.map((row) => (
        <tr key={row} className="border-b border-outline/40">
          <td className="px-2 py-4">
            <div className="h-3 w-6 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-2 py-4">
            <div className="h-3 w-44 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-2.5 w-24 animate-pulse rounded bg-slate-100" />
          </td>
          {ESG_MONTHS.map((month) => (
            <td key={month.month} className="px-2 py-4">
              <div className="h-8 w-full animate-pulse rounded bg-slate-100" />
            </td>
          ))}
          <td className="px-2 py-4">
            <div className="h-3 w-14 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-2 py-4">
            <div className="ml-auto h-3 w-14 animate-pulse rounded bg-slate-100" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function EsgTable({
  rows,
  initialLoading,
  emptyMessage,
  emptyActionLabel,
  onEmptyAction,
  canManage,
  savingCells,
  onMonthChange,
  onEdit,
  onDelete,
}: {
  rows: EsgAssessment[];
  initialLoading: boolean;
  emptyMessage: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  canManage: boolean;
  savingCells: Set<string>;
  onMonthChange: (
    row: EsgAssessment,
    month: number,
    status: EsgMonthStatus | null,
  ) => void;
  onEdit: (row: EsgAssessment) => void;
  onDelete: (row: EsgAssessment) => void;
}) {
  const busyRowIds = new Set(
    [...savingCells].map((key) => key.slice(0, key.indexOf(":"))),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1240px] table-fixed border-collapse text-xs">
        <thead>
          <tr>
            <th scope="col" className={`${headerCell} w-12 text-center`}>
              No
            </th>
            <th scope="col" className={`${headerCell} w-60`}>
              Nama Proyek
            </th>
            {ESG_MONTHS.map((month) => (
              <th
                key={month.month}
                scope="col"
                title={month.label}
                className={`${headerCell} w-14 text-center`}
              >
                <span aria-hidden="true">{month.short}</span>
                <span className="sr-only">{month.label}</span>
              </th>
            ))}
            <th scope="col" className={`${headerCell} w-24 text-center`}>
              Doc
            </th>
            <th scope="col" className={`${headerCell} w-24 text-right`}>
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {initialLoading ? (
            <TableSkeleton />
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={16} className="px-4 py-12 text-center">
                <p className="text-sm font-semibold text-primary/70">
                  {emptyMessage}
                </p>
                {emptyActionLabel && onEmptyAction ? (
                  <button
                    type="button"
                    onClick={onEmptyAction}
                    className="mt-3 rounded-lg border border-outline bg-white px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-background"
                  >
                    {emptyActionLabel}
                  </button>
                ) : null}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const rowBusy = busyRowIds.has(row.id);
              return (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-background/60"
                >
                  <td
                    className={`${bodyCell} text-center tabular-nums text-primary/50`}
                  >
                    {index + 1}
                  </td>
                  <td className={`${bodyCell} min-w-0`}>
                    <span className="block truncate font-semibold text-primary">
                      {displayText(row.project.name)}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-primary/50">
                      {displayText(row.project.location)} · {row.year}
                    </span>
                  </td>
                  {ESG_MONTHS.map((month) => {
                    const key = `${row.id}:${month.month}`;
                    const cell = row.months.find(
                      (item) => item.month === month.month,
                    );
                    const status = cell?.status ?? null;
                    const saving = savingCells.has(key);
                    const disabled = !canManage || rowBusy;

                    return (
                      <td key={month.month} className={`${bodyCell} px-1.5`}>
                        <div className="relative">
                          <select
                            value={status ?? ""}
                            disabled={disabled}
                            aria-busy={saving || undefined}
                            aria-label={`Status ${month.label} ${row.project.name}`}
                            title={`${month.label} · ${row.project.name}`}
                            onChange={(event) => {
                              const next = event.target.value;
                              onMonthChange(
                                row,
                                month.month,
                                next === "" ? null : (next as EsgMonthStatus),
                              );
                            }}
                            className={`${selectClass(status)} ${
                              disabled
                                ? "cursor-not-allowed opacity-80"
                                : "cursor-pointer"
                            }`}
                          >
                            <option value="">{"\u00a0"}</option>
                            <option value="Complete">Complete</option>
                            <option value="Half">Half</option>
                          </select>
                          {saving ? (
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                aria-hidden="true"
                                className="animate-spin text-primary/60"
                              >
                                <path d="M21 12a9 9 0 1 1-6.2-8.56" />
                              </svg>
                            </span>
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                  <td className={`${bodyCell} text-center`}>
                    {row.documentation_url ? (
                      <a
                        href={row.documentation_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Buka dokumentasi ${row.project.name}`}
                        title="Buka dokumentasi"
                        className="inline-flex rounded px-2 py-1 text-[11px] font-bold text-secondary hover:bg-blue-50"
                      >
                        Buka link
                      </a>
                    ) : (
                      <span className="text-primary/40">{EMPTY_VALUE}</span>
                    )}
                  </td>
                  <td className={`${bodyCell} whitespace-nowrap text-right`}>
                    {canManage ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(row)}
                          aria-label={`Edit ${row.project.name}`}
                          title="Edit penilaian"
                          className="rounded p-2 text-secondary transition-colors hover:bg-blue-50"
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(row)}
                          aria-label={`Hapus ${row.project.name}`}
                          title="Hapus penilaian"
                          className="rounded p-2 text-red-700 transition-colors hover:bg-red-50"
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v5" />
                            <path d="M14 11v5" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <span className="text-primary/40">{EMPTY_VALUE}</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
