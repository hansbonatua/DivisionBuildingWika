"use client";

import Link from "next/link";

// Presentational table for one Engineering Database category. Edit/Delete are
// rendered only for manage roles (Admin, Head Office, Project); Management
// keeps a read-only Aksi column with an explicit empty marker.

export type EngineeringDatabaseTableRow = {
  id: string;
  project: { id: string; name: string; location: string };
  fileUrl: string;
  pic: { id: string; name: string };
  note: string;
};

const EMPTY_VALUE = "\u2014";

const headerCell =
  "whitespace-nowrap border-b border-outline bg-background px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";

const bodyCell =
  "border-b border-outline/50 px-4 py-3 align-top text-xs text-primary/80";

const skeletonRows = ["first", "second", "third", "fourth"];

function displayText(value: string | null | undefined): string {
  return typeof value === "string" && value.trim() !== "" ? value : EMPTY_VALUE;
}

function TableSkeleton() {
  return (
    <>
      {skeletonRows.map((row) => (
        <tr key={row} className="border-b border-outline/40">
          <td className="px-4 py-4">
            <div className="h-3 w-8 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-56 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-48 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="ml-auto h-3 w-10 animate-pulse rounded bg-slate-100" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function EngineeringDatabaseTable({
  rows,
  initialLoading,
  emptyMessage,
  categorySlug,
  canManage,
  deletingId,
  onDelete,
}: {
  rows: EngineeringDatabaseTableRow[];
  initialLoading: boolean;
  emptyMessage: string;
  categorySlug: string;
  canManage: boolean;
  deletingId: string | null;
  onDelete: (row: EngineeringDatabaseTableRow) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-xs">
        <thead>
          <tr>
            <th scope="col" className={`${headerCell} w-16`}>
              No
            </th>
            <th scope="col" className={headerCell}>
              Nama Proyek
            </th>
            <th scope="col" className={headerCell}>
              File
            </th>
            <th scope="col" className={headerCell}>
              PIC
            </th>
            <th scope="col" className={headerCell}>
              Note
            </th>
            <th scope="col" className={`${headerCell} text-right`}>
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {initialLoading ? (
            <TableSkeleton />
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-10 text-center text-xs font-medium text-primary/60"
              >
                <p className="text-sm font-medium text-primary/70">{emptyMessage}</p>
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
                  {row.project.location.trim() !== "" ? (
                    <span className="mt-0.5 block text-[11px] text-primary/50">
                      {row.project.location}
                    </span>
                  ) : null}
                </td>
                <td className={`${bodyCell} whitespace-nowrap`}>
                  <a
                    href={row.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-bold text-secondary hover:bg-blue-50"
                  >
                    <span>Buka File</span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M15 3h6v6" />
                      <path d="M10 14 21 3" />
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    </svg>
                  </a>
                </td>
                <td className={`${bodyCell} min-w-40`}>{displayText(row.pic.name)}</td>
                <td className={`${bodyCell} min-w-56`}>
                  <span
                    className="line-clamp-2 max-w-72 text-primary/70"
                    title={row.note}
                  >
                    {displayText(row.note)}
                  </span>
                </td>
                <td className={`${bodyCell} whitespace-nowrap text-right`}>
                  {canManage ? (
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/dashboard/engineering-database/${categorySlug}/${row.id}/edit`}
                        className="rounded px-2.5 py-1 text-xs font-bold text-secondary hover:bg-blue-50"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={deletingId !== null}
                        onClick={() => onDelete(row)}
                        title={`Hapus ${row.project.name}`}
                        className="rounded px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === row.id ? "Menghapus..." : "Hapus"}
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
