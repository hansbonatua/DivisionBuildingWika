"use client";

import { formatMslScore } from "@/lib/msl/score";
import type { MslYearRowDto } from "./msl-api.types";
import { MslCategoryBadge } from "./MslLegend";
import {
  type MslDraft,
  MSL_NOTE_MAX_LENGTH,
  previewMslDraft,
  toMslDraft,
} from "./msl-draft";

// Presentational table for the MSL year view.
//
// Three row states:
//   A. unassessed  -> inline inputs + Simpan (manage roles only)
//   B. saved       -> read-only values, score, category, remarks; Edit + Hapus
//   C. editing     -> inline inputs + live preview; Simpan + Batal
//
// Only ONE assessment may be edited at a time (the saved-row edit). While that
// edit is open, other rows' controls are disabled so no draft can be lost.
// Read-only roles never receive inputs or mutation buttons at all.

export type MslEditingState = {
  projectId: string;
  assessmentId: string;
  draft: MslDraft;
  initial: MslDraft;
  error: string | null;
};

const EMPTY_VALUE = "\u2014";

const headerCell =
  "whitespace-nowrap border-b border-outline bg-background px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";

const bodyCell = "border-b border-outline/50 px-4 py-3 align-top text-xs text-primary/80";

const inputClass =
  "h-8 w-24 rounded border border-outline/60 bg-white px-2 text-xs font-semibold text-primary tabular-nums focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";

const textareaClass =
  "w-full min-w-48 rounded border border-outline/60 bg-white px-2 py-1.5 text-xs text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";

function ScoreInput({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <input
      id={id}
      type="number"
      min="1"
      max="5"
      step="0.01"
      inputMode="decimal"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className={inputClass}
    />
  );
}

// Live preview cells: the score column shows only the score, the category
// column only the badge, each derived from the same shared engine call.
function LiveScorePreview({ draft }: { draft: MslDraft }) {
  const preview = previewMslDraft(draft);
  if (!preview) {
    return <span className="text-primary/40">{EMPTY_VALUE}</span>;
  }
  return (
    <span className="text-sm font-bold tabular-nums text-primary">
      {formatMslScore(preview.score)}
    </span>
  );
}

function LiveCategoryPreview({ draft }: { draft: MslDraft }) {
  const preview = previewMslDraft(draft);
  if (!preview) {
    return <span className="text-primary/40">{EMPTY_VALUE}</span>;
  }
  return <MslCategoryBadge category={preview.category} />;
}

export default function MslTable({
  rows,
  canManage,
  initialLoading,
  emptyMessage,
  editing,
  createDrafts,
  createErrors,
  busyProjectId,
  onStartEdit,
  onCancelEdit,
  onEditDraftChange,
  onCreateDraftChange,
  onSaveEdit,
  onSaveNew,
  onDelete,
}: {
  rows: MslYearRowDto[];
  canManage: boolean;
  initialLoading: boolean;
  emptyMessage: string;
  editing: MslEditingState | null;
  createDrafts: Record<string, MslDraft>;
  createErrors: Record<string, string>;
  busyProjectId: string | null;
  onStartEdit: (row: MslYearRowDto) => void;
  onCancelEdit: () => void;
  onEditDraftChange: (patch: Partial<MslDraft>) => void;
  onCreateDraftChange: (projectId: string, patch: Partial<MslDraft>) => void;
  onSaveEdit: () => void;
  onSaveNew: (row: MslYearRowDto) => void;
  onDelete: (row: MslYearRowDto) => void;
}) {
  const anotherRowEditing = editing !== null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] border-collapse text-xs">
        <thead>
          <tr>
            <th scope="col" className={`${headerCell} w-14`}>
              No
            </th>
            <th scope="col" className={`${headerCell} min-w-56`}>
              Nama Proyek
            </th>
            <th scope="col" className={headerCell}>
              Engineering Value
            </th>
            <th scope="col" className={headerCell}>
              Metode Kerja
            </th>
            <th scope="col" className={headerCell}>
              Engineering Execution
            </th>
            <th scope="col" className={headerCell}>
              MSL Score
            </th>
            <th scope="col" className={headerCell}>
              MSL Kategori
            </th>
            <th scope="col" className={`${headerCell} min-w-64`}>
              Remarks
            </th>
            <th scope="col" className={`${headerCell} text-right`}>
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {initialLoading ? (
            ["first", "second", "third"].map((key) => (
              <tr key={key} className="border-b border-outline/40">
                {Array.from({ length: 9 }).map((_, index) => (
                  <td key={index} className="px-4 py-4">
                    <div className="h-3 w-full max-w-24 animate-pulse rounded bg-slate-100" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-4 py-10 text-center">
                <p className="text-sm font-medium text-primary/70">{emptyMessage}</p>
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const assessment = row.assessment;
              const isEditingRow = editing?.projectId === row.projectId;
              const isBusy = busyProjectId === row.projectId;
              const isUnassessed = assessment === null;
              const createDraft = createDrafts[row.projectId] ?? toMslDraft(null);
              // A row is interactive when it is the row being edited, or when it
              // is an unassessed row and no other row holds an edit draft.
              const showCreateInputs = canManage && isUnassessed && !isEditingRow;
              const createInputsDisabled = anotherRowEditing || busyProjectId !== null;
              const rowError = isEditingRow
                ? editing?.error
                : showCreateInputs
                  ? createErrors[row.projectId]
                  : null;

              return (
                <tr
                  key={row.projectId}
                  className={`transition-colors ${isEditingRow ? "bg-blue-50/40" : "hover:bg-background/60"}`}
                >
                  <td className={`${bodyCell} tabular-nums text-primary/50`}>{index + 1}</td>
                  <td className={`${bodyCell} min-w-56`}>
                    <span className="block font-semibold text-primary">{row.name}</span>
                    {row.location.trim() !== "" ? (
                      <span className="mt-0.5 block text-[11px] text-primary/50">
                        {row.location}
                      </span>
                    ) : null}
                    {isUnassessed ? (
                      <span className="mt-1 inline-flex items-center rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        Belum Dinilai
                      </span>
                    ) : null}
                  </td>

                  {isEditingRow ? (
                    <>
                      <td className={bodyCell}>
                        <ScoreInput
                          id={`msl-ev-${row.projectId}`}
                          label={`Engineering Value ${row.name}`}
                          value={editing.draft.engineeringValue}
                          disabled={isBusy}
                          onChange={(value) => onEditDraftChange({ engineeringValue: value })}
                        />
                      </td>
                      <td className={bodyCell}>
                        <ScoreInput
                          id={`msl-mk-${row.projectId}`}
                          label={`Metode Kerja ${row.name}`}
                          value={editing.draft.metodeKerja}
                          disabled={isBusy}
                          onChange={(value) => onEditDraftChange({ metodeKerja: value })}
                        />
                      </td>
                      <td className={bodyCell}>
                        <ScoreInput
                          id={`msl-ee-${row.projectId}`}
                          label={`Engineering Execution ${row.name}`}
                          value={editing.draft.engineeringExecution}
                          disabled={isBusy}
                          onChange={(value) => onEditDraftChange({ engineeringExecution: value })}
                        />
                      </td>
                      <td className={`${bodyCell} whitespace-nowrap tabular-nums`}>
                        <LiveScorePreview draft={editing.draft} />
                      </td>
                      <td className={bodyCell}>
                        <LiveCategoryPreview draft={editing.draft} />
                      </td>
                      <td className={`${bodyCell} min-w-64`}>
                        <label htmlFor={`msl-remarks-${row.projectId}`} className="sr-only">
                          Remarks {row.name}
                        </label>
                        <textarea
                          id={`msl-remarks-${row.projectId}`}
                          rows={2}
                          maxLength={MSL_NOTE_MAX_LENGTH}
                          value={editing.draft.remarks}
                          disabled={isBusy}
                          onChange={(event) => onEditDraftChange({ remarks: event.target.value })}
                          className={textareaClass}
                        />
                        {rowError ? (
                          <p className="mt-1 text-[11px] font-semibold text-red-700">{rowError}</p>
                        ) : null}
                      </td>
                      <td className={`${bodyCell} whitespace-nowrap text-right`}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={onSaveEdit}
                            disabled={isBusy}
                            className="rounded bg-primary px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isBusy ? "Menyimpan..." : "Simpan"}
                          </button>
                          <button
                            type="button"
                            onClick={onCancelEdit}
                            disabled={isBusy}
                            className="rounded px-2.5 py-1 text-xs font-bold text-primary/70 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Batal
                          </button>
                        </div>
                      </td>
                    </>
                  ) : showCreateInputs ? (
                    <>
                      <td className={bodyCell}>
                        <ScoreInput
                          id={`msl-new-ev-${row.projectId}`}
                          label={`Engineering Value ${row.name}`}
                          value={createDraft.engineeringValue}
                          disabled={createInputsDisabled}
                          onChange={(value) =>
                            onCreateDraftChange(row.projectId, { engineeringValue: value })
                          }
                        />
                      </td>
                      <td className={bodyCell}>
                        <ScoreInput
                          id={`msl-new-mk-${row.projectId}`}
                          label={`Metode Kerja ${row.name}`}
                          value={createDraft.metodeKerja}
                          disabled={createInputsDisabled}
                          onChange={(value) =>
                            onCreateDraftChange(row.projectId, { metodeKerja: value })
                          }
                        />
                      </td>
                      <td className={bodyCell}>
                        <ScoreInput
                          id={`msl-new-ee-${row.projectId}`}
                          label={`Engineering Execution ${row.name}`}
                          value={createDraft.engineeringExecution}
                          disabled={createInputsDisabled}
                          onChange={(value) =>
                            onCreateDraftChange(row.projectId, { engineeringExecution: value })
                          }
                        />
                      </td>
                      <td className={`${bodyCell} whitespace-nowrap tabular-nums`}>
                        <LiveScorePreview draft={createDraft} />
                      </td>
                      <td className={bodyCell}>
                        <LiveCategoryPreview draft={createDraft} />
                      </td>
                      <td className={`${bodyCell} min-w-64`}>
                        <label htmlFor={`msl-new-remarks-${row.projectId}`} className="sr-only">
                          Remarks {row.name}
                        </label>
                        <textarea
                          id={`msl-new-remarks-${row.projectId}`}
                          rows={2}
                          maxLength={MSL_NOTE_MAX_LENGTH}
                          value={createDraft.remarks}
                          disabled={createInputsDisabled}
                          onChange={(event) =>
                            onCreateDraftChange(row.projectId, { remarks: event.target.value })
                          }
                          className={textareaClass}
                          placeholder="Opsional"
                        />
                        {rowError ? (
                          <p className="mt-1 text-[11px] font-semibold text-red-700">{rowError}</p>
                        ) : null}
                      </td>
                      <td className={`${bodyCell} whitespace-nowrap text-right`}>
                        <button
                          type="button"
                          onClick={() => onSaveNew(row)}
                          disabled={isBusy || createInputsDisabled}
                          title={
                            createInputsDisabled
                              ? "Selesaikan atau batalkan edit pada baris lain terlebih dahulu."
                              : `Simpan penilaian ${row.name}`
                          }
                          className="rounded bg-primary px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isBusy ? "Menyimpan..." : "Simpan"}
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`${bodyCell} whitespace-nowrap tabular-nums`}>
                        {assessment ? (
                          formatMslScore(assessment.engineeringValue)
                        ) : (
                          <span className="text-primary/40">{EMPTY_VALUE}</span>
                        )}
                      </td>
                      <td className={`${bodyCell} whitespace-nowrap tabular-nums`}>
                        {assessment ? (
                          formatMslScore(assessment.metodeKerja)
                        ) : (
                          <span className="text-primary/40">{EMPTY_VALUE}</span>
                        )}
                      </td>
                      <td className={`${bodyCell} whitespace-nowrap tabular-nums`}>
                        {assessment ? (
                          formatMslScore(assessment.engineeringExecution)
                        ) : (
                          <span className="text-primary/40">{EMPTY_VALUE}</span>
                        )}
                      </td>
                      <td className={`${bodyCell} whitespace-nowrap`}>
                        {assessment ? (
                          <span className="text-sm font-bold tabular-nums text-primary">
                            {formatMslScore(assessment.score)}
                          </span>
                        ) : (
                          <span className="text-primary/40">{EMPTY_VALUE}</span>
                        )}
                      </td>
                      <td className={`${bodyCell} whitespace-nowrap`}>
                        {assessment ? (
                          <MslCategoryBadge category={assessment.category} />
                        ) : (
                          <span className="text-primary/40">{EMPTY_VALUE}</span>
                        )}
                      </td>
                      <td className={`${bodyCell} min-w-64`}>
                        {assessment?.remarks ? (
                          <span
                            className="line-clamp-2 max-w-72 text-primary/70"
                            title={assessment.remarks}
                          >
                            {assessment.remarks}
                          </span>
                        ) : (
                          <span className="text-primary/40">{EMPTY_VALUE}</span>
                        )}
                      </td>
                      <td className={`${bodyCell} whitespace-nowrap text-right`}>
                        {canManage && assessment ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onStartEdit(row)}
                              disabled={anotherRowEditing || busyProjectId !== null}
                              title={
                                anotherRowEditing
                                  ? "Selesaikan atau batalkan edit pada baris lain terlebih dahulu."
                                  : `Edit penilaian ${row.name}`
                              }
                              className="rounded px-2.5 py-1 text-xs font-bold text-secondary hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(row)}
                              disabled={anotherRowEditing || busyProjectId !== null}
                              title={`Hapus penilaian ${row.name}`}
                              className="rounded px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isBusy ? "Menghapus..." : "Hapus"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-primary/40">{EMPTY_VALUE}</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
