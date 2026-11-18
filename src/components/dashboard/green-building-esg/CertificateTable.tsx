"use client";

import type { GreenBuildingCertificate } from "@/components/dashboard/green-building-esg/types";

const EMPTY_VALUE = "\u2014";
const skeletonRows = ["first", "second", "third", "fourth"];

const headerCell =
  "whitespace-nowrap border-b border-outline bg-background px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";
const bodyCell =
  "border-b border-outline/50 px-4 py-3 align-top text-xs text-primary/80";

function displayText(value: string | null | undefined): string {
  return typeof value === "string" && value.trim() !== "" ? value : EMPTY_VALUE;
}

function statusClass(status: string): string {
  if (status === "Certified") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "Under Construction") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function TableSkeleton() {
  return (
    <>
      {skeletonRows.map((row) => (
        <tr key={row} className="border-b border-outline/40">
          <td className="px-4 py-4">
            <div className="h-3 w-6 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-48 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-2.5 w-28 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-10 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-14 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="ml-auto h-3 w-16 animate-pulse rounded bg-slate-100" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function CertificateTable({
  rows,
  initialLoading,
  emptyMessage,
  emptyActionLabel,
  onEmptyAction,
  canManage,
  onEdit,
  onDelete,
}: {
  rows: GreenBuildingCertificate[];
  initialLoading: boolean;
  emptyMessage: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  canManage: boolean;
  onEdit: (row: GreenBuildingCertificate) => void;
  onDelete: (row: GreenBuildingCertificate) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] border-collapse text-xs">
        <thead>
          <tr>
            <th scope="col" className={`${headerCell} w-16`}>No</th>
            <th scope="col" className={headerCell}>Nama Proyek</th>
            <th scope="col" className={headerCell}>Nilai Proyek</th>
            <th scope="col" className={headerCell}>Tahun</th>
            <th scope="col" className={headerCell}>Lembaga</th>
            <th scope="col" className={headerCell}>Level</th>
            <th scope="col" className={headerCell}>Status</th>
            <th scope="col" className={headerCell}>Dokumentasi</th>
            <th scope="col" className={`${headerCell} text-right`}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {initialLoading ? (
            <TableSkeleton />
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-4 py-12 text-center">
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
            rows.map((row, index) => (
              <tr key={row.id} className="transition-colors hover:bg-background/60">
                <td className={`${bodyCell} tabular-nums text-primary/50`}>
                  {index + 1}
                </td>
                <td className={`${bodyCell} min-w-56`}>
                  <span className="block font-semibold text-primary">
                    {displayText(row.project.name)}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-primary/50">
                    {displayText(row.project.location)}
                  </span>
                </td>
                <td className={`${bodyCell} min-w-36`}>
                  {displayText(row.project_value)}
                </td>
                <td className={`${bodyCell} tabular-nums`}>
                  {row.certificate_year}
                </td>
                <td className={bodyCell}>
                  <span className="inline-flex rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-secondary">
                    {row.lembaga}
                  </span>
                </td>
                <td className={`${bodyCell} whitespace-nowrap font-semibold`}>
                  {row.level}
                </td>
                <td className={bodyCell}>
                  <span
                    className={`inline-flex whitespace-nowrap rounded border px-2 py-0.5 text-[11px] font-bold ${statusClass(row.status)}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className={bodyCell}>
                  {row.documentation_url ? (
                    <a
                      href={row.documentation_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Buka dokumentasi ${row.project.name}`}
                      title="Buka dokumentasi"
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-bold text-secondary hover:bg-blue-50"
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
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      <span>Buka link</span>
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
                        title="Edit sertifikat"
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
                        title="Hapus sertifikat"
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
