"use client";

import { Fragment } from "react";
import { PDOC_WEEKS } from "@/lib/project-documentation/constants";
import {
  formatPdocMetadata,
  type PdocEditingState,
  type PdocRowDto,
  type PdocWeekDto,
} from "@/lib/project-documentation/pdoc-draft";

// Inline table for Project Documentation. The page owns the one-row editing
// state machine; this component only renders read/edit modes and forwards user
// intent.

export const PDOC_COLUMN_COUNT = 8;

const EMPTY_VALUE = "—";

const headerCell =
  "whitespace-nowrap border-b border-outline bg-background px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";
const bodyCell =
  "border-b border-outline/50 px-3 py-2 align-top text-xs text-primary/80";
const inputClass =
  "h-8 w-full min-w-36 rounded border border-outline/60 bg-white px-2 text-[11px] font-semibold text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";
const textareaClass =
  "w-full min-w-44 rounded border border-outline/60 bg-white px-2 py-1.5 text-[11px] text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";
const actionButton =
  "inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-md border border-outline bg-white px-2 text-[11px] font-bold leading-none text-primary/70 transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40";
const primaryButton =
  "inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-md bg-primary px-2.5 text-[11px] font-bold leading-none text-white transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40";

function ProjectName({ row }: { row: PdocRowDto }) {
  return (
    <th scope="row" className={`${bodyCell} min-w-52 text-left`}>
      <span className="block font-bold text-primary">{row.project_name}</span>
      <span className="mt-0.5 block text-[10px] font-medium text-primary/50">
        {row.project_location} · {row.project_year}
      </span>
    </th>
  );
}

function WeekCell({ week }: { week: PdocWeekDto | null }) {
  if (!week?.url) {
    return <span className="text-primary/40">{EMPTY_VALUE}</span>;
  }
  return (
    <div className="min-w-0">
      <a
        href={week.url}
        target="_blank"
        rel="noopener noreferrer"
        title={week.url}
        className="flex max-w-[190px] items-start gap-1 text-[11px] font-semibold text-secondary underline decoration-secondary/30 underline-offset-2 hover:decoration-secondary"
      >
        <span aria-hidden="true">🔗</span>
        <span className="truncate">{week.url}</span>
      </a>
      <p
        className="mt-1 max-w-[190px] truncate text-[10px] font-medium text-primary/50"
        title={formatPdocMetadata(week)}
      >
        {formatPdocMetadata(week)}
      </p>
    </div>
  );
}

function NoteCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-primary/40">{EMPTY_VALUE}</span>;
  return (
    <span
      title={value}
      className="block max-w-[240px] overflow-hidden text-[11px] font-medium leading-snug text-primary/70 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
    >
      {value}
    </span>
  );
}

function EditRow({
  row,
  editing,
  busy,
  onWeekChange,
  onCatatanChange,
  onCancel,
  onSave,
}: {
  row: PdocRowDto;
  editing: PdocEditingState;
  busy: boolean;
  onWeekChange: (index: number, value: string) => void;
  onCatatanChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <>
      <tr className="bg-blue-50/40">
        <ProjectName row={row} />
        {PDOC_WEEKS.map((week, index) => (
          <td key={week} className={`${bodyCell} min-w-40`}>
            <label htmlFor={`pdoc-week-${week}`} className="sr-only">
              Minggu {week} untuk {row.project_name}
            </label>
            <input
              id={`pdoc-week-${week}`}
              type="url"
              maxLength={2048}
              value={editing.draft.weeks[index]}
              disabled={busy}
              placeholder="Paste URL..."
              aria-label={`Minggu ${week} untuk ${row.project_name}`}
              onChange={(event) => onWeekChange(index, event.target.value)}
              className={inputClass}
            />
          </td>
        ))}
        <td className={`${bodyCell} min-w-56`}>
          <label htmlFor="pdoc-catatan" className="sr-only">
            Catatan untuk {row.project_name}
          </label>
          <textarea
            id="pdoc-catatan"
            rows={2}
            maxLength={2000}
            value={editing.draft.catatan}
            disabled={busy}
            placeholder="Catatan opsional..."
            aria-label={`Catatan untuk ${row.project_name}`}
            onChange={(event) => onCatatanChange(event.target.value)}
            className={textareaClass}
          />
        </td>
        <td className={`${bodyCell} whitespace-nowrap text-right`}>
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={onSave}
              disabled={busy}
              className={primaryButton}
            >
              <span aria-hidden="true">💾</span>
              <span>{busy ? "Menyimpan..." : "Simpan"}</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className={actionButton}
            >
              <span aria-hidden="true">✕</span>
              <span>Batal</span>
            </button>
          </div>
        </td>
      </tr>
      {editing.error ? (
        <tr className="bg-red-50/60">
          <td colSpan={PDOC_COLUMN_COUNT} className="px-3 py-2">
            <p role="alert" className="text-[11px] font-semibold text-red-700">
              {editing.error}
            </p>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export default function PdocTable({
  rows,
  canManage,
  editing,
  busy,
  emptyMessage,
  onStartEdit,
  onWeekChange,
  onCatatanChange,
  onCancelEdit,
  onSaveEdit,
}: {
  rows: readonly PdocRowDto[];
  canManage: boolean;
  editing: PdocEditingState | null;
  busy: boolean;
  emptyMessage: string;
  onStartEdit: (row: PdocRowDto) => void;
  onWeekChange: (index: number, value: string) => void;
  onCatatanChange: (value: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-outline bg-surface shadow-sm">
      <table className="w-full min-w-[1400px] border-collapse text-xs">
        <caption className="sr-only">
          Project Documentation per Master Project
        </caption>
        <thead>
          <tr>
            <th scope="col" className={`${headerCell} w-56`}>
              Nama Proyek
            </th>
            {PDOC_WEEKS.map((week) => (
              <th key={week} scope="col" className={`${headerCell} min-w-40`}>
                Minggu {week}
              </th>
            ))}
            <th scope="col" className={`${headerCell} min-w-56`}>
              Catatan
            </th>
            <th scope="col" className={`${headerCell} w-36 text-right`}>
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) =>
            editing?.projectId === row.project_id ? (
              <Fragment key={row.project_id}>
                <EditRow
                  row={row}
                  editing={editing}
                  busy={busy}
                  onWeekChange={onWeekChange}
                  onCatatanChange={onCatatanChange}
                  onCancel={onCancelEdit}
                  onSave={onSaveEdit}
                />
              </Fragment>
            ) : (
              <tr
                key={row.project_id}
                className="transition-colors hover:bg-background/60"
              >
                <ProjectName row={row} />
                {PDOC_WEEKS.map((week) => (
                  <td key={week} className={`${bodyCell} min-w-40`}>
                    <WeekCell
                      week={row.weeks.find((item) => item.week === week) ?? null}
                    />
                  </td>
                ))}
                <td className={`${bodyCell} min-w-56`}>
                  <NoteCell value={row.catatan} />
                </td>
                <td className={`${bodyCell} whitespace-nowrap text-right`}>
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => onStartEdit(row)}
                      disabled={busy || editing !== null}
                      className={actionButton}
                    >
                      <span aria-hidden="true">✏️</span>
                      <span>Edit</span>
                    </button>
                  ) : (
                    <span className="text-primary/40">{EMPTY_VALUE}</span>
                  )}
                </td>
              </tr>
            ),
          )}

          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={PDOC_COLUMN_COUNT}
                className="border-b border-outline/50 px-3 py-10 text-center"
              >
                <p className="text-xs font-medium text-primary/60">
                  {emptyMessage}
                </p>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
