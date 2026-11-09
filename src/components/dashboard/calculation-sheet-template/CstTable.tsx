"use client";

import {
  type CstCreatingState,
  type CstDraft,
  type CstEditingState,
  type CstPicDto,
  type CstTemplateRow,
} from "@/lib/calculation-sheet-template/cst-draft";

// Inline table for ONE Calculation Sheet Template category. The page header
// already names the category, so the table no longer renders a category
// header or loops over the seven categories; it has exactly one <tbody>.
//
// Rows are read-only unless the actor can manage; the page owns the state
// machine (one editing row / one creating row), this component only renders it
// and forwards intent.

export const CST_COLUMN_COUNT = 6;

const EMPTY_VALUE = "\u2014";

const headerCell =
  "whitespace-nowrap border-b border-outline bg-background px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";
const bodyCell =
  "border-b border-outline/50 px-3 py-2 align-top text-xs text-primary/80";
const inputClass =
  "h-8 w-full rounded border border-outline/60 bg-white px-2 text-xs font-semibold text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";
const textareaClass =
  "w-full min-w-40 rounded border border-outline/60 bg-white px-2 py-1.5 text-xs text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";
const actionButton =
  "inline-flex h-7 shrink-0 items-center justify-center rounded-md border border-outline bg-white px-2 text-[11px] font-bold leading-none text-primary/70 transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40";
const primaryButton =
  "inline-flex h-7 shrink-0 items-center justify-center rounded-md bg-primary px-2.5 text-[11px] font-bold leading-none text-white transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40";
const dangerButton =
  "inline-flex h-7 shrink-0 items-center justify-center rounded-md border border-red-200 bg-white px-2 text-[11px] font-bold leading-none text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40";

function picLabel(pic: CstPicDto): string {
  return pic.status === "active" ? pic.name : `${pic.name} (non-aktif)`;
}

function NoteCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-primary/40">{EMPTY_VALUE}</span>;
  return (
    <span
      title={value}
      className="block max-w-[260px] overflow-hidden text-[11px] font-medium leading-snug text-primary/70 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
    >
      {value}
    </span>
  );
}

function EvidenceCell({ url }: { url: string | null }) {
  if (!url) return <span className="text-primary/40">{EMPTY_VALUE}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      className="block max-w-[200px] truncate text-[11px] font-semibold text-secondary underline decoration-secondary/30 underline-offset-2 hover:decoration-secondary"
    >
      {url}
    </a>
  );
}

function DraftFields({
  idPrefix,
  draft,
  busy,
  picOptions,
  picLoading,
  picError,
  onChange,
}: {
  idPrefix: string;
  draft: CstDraft;
  busy: boolean;
  picOptions: readonly CstPicDto[];
  picLoading: boolean;
  picError: string | null;
  onChange: (patch: Partial<CstDraft>) => void;
}) {
  return (
    <>
      <td className={bodyCell}>
        <label htmlFor={`${idPrefix}-kode`} className="sr-only">
          Kode
        </label>
        <input
          id={`${idPrefix}-kode`}
          type="text"
          maxLength={30}
          value={draft.kode}
          disabled={busy}
          placeholder="Kode"
          onChange={(event) => onChange({ kode: event.target.value })}
          className={`${inputClass} font-mono uppercase`}
        />
      </td>
      <td className={bodyCell}>
        <label htmlFor={`${idPrefix}-nama`} className="sr-only">
          Nama
        </label>
        <input
          id={`${idPrefix}-nama`}
          type="text"
          maxLength={200}
          value={draft.nama}
          disabled={busy}
          placeholder="Nama"
          onChange={(event) => onChange({ nama: event.target.value })}
          className={inputClass}
        />
      </td>
      <td className={bodyCell}>
        <label htmlFor={`${idPrefix}-pic`} className="sr-only">
          PIC
        </label>
        <select
          id={`${idPrefix}-pic`}
          value={draft.picUserId}
          disabled={busy || picLoading || picOptions.length === 0}
          onChange={(event) => onChange({ picUserId: event.target.value })}
          className={inputClass}
        >
          <option value="">{picLoading ? "Memuat PIC..." : "Pilih PIC..."}</option>
          {picOptions.map((option) => (
            <option key={option.user_id} value={option.user_id}>
              {option.status === "active"
                ? option.name
                : `${option.name} (non-aktif)`}
            </option>
          ))}
        </select>
        {picError ? (
          <p className="mt-1 text-[10px] font-semibold text-red-700">{picError}</p>
        ) : null}
      </td>
      <td className={bodyCell}>
        <label htmlFor={`${idPrefix}-evidence`} className="sr-only">
          Link evidence
        </label>
        <input
          id={`${idPrefix}-evidence`}
          type="url"
          maxLength={2048}
          value={draft.evidenceUrl}
          disabled={busy}
          placeholder="https://..."
          onChange={(event) => onChange({ evidenceUrl: event.target.value })}
          className={inputClass}
        />
      </td>
      <td className={bodyCell}>
        <label htmlFor={`${idPrefix}-catatan`} className="sr-only">
          Catatan
        </label>
        <textarea
          id={`${idPrefix}-catatan`}
          rows={2}
          maxLength={2000}
          value={draft.catatan}
          disabled={busy}
          placeholder="Opsional"
          onChange={(event) => onChange({ catatan: event.target.value })}
          className={textareaClass}
        />
      </td>
      <td className={`${bodyCell} whitespace-nowrap text-right`}>
        <span className="text-[11px] text-primary/40">—</span>
      </td>
    </>
  );
}

function ActionCell({
  busy,
  onEdit,
  onDelete,
}: {
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
      <button
        type="button"
        onClick={onEdit}
        disabled={busy}
        className={actionButton}
      >
        Edit
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className={dangerButton}
      >
        Hapus
      </button>
    </div>
  );
}

export default function CstTable({
  rows,
  canManage,
  editing,
  creating,
  busy,
  picOptions,
  picLoading,
  picError,
  onStartEdit,
  onCancelEdit,
  onEditDraftChange,
  onSaveEdit,
  onDelete,
  onStartCreate,
  onCancelCreate,
  onCreateDraftChange,
  onSaveCreate,
}: {
  rows: CstTemplateRow[];
  canManage: boolean;
  editing: CstEditingState | null;
  creating: CstCreatingState | null;
  busy: boolean;
  picOptions: readonly CstPicDto[];
  picLoading: boolean;
  picError: string | null;
  onStartEdit: (row: CstTemplateRow) => void;
  onCancelEdit: () => void;
  onEditDraftChange: (patch: Partial<CstDraft>) => void;
  onSaveEdit: () => void;
  onDelete: (row: CstTemplateRow) => void;
  onStartCreate: () => void;
  onCancelCreate: () => void;
  onCreateDraftChange: (patch: Partial<CstDraft>) => void;
  onSaveCreate: () => void;
}) {
  return (
    <>
      {canManage && !creating ? (
        <div className="mb-3 flex justify-start">
          <button
            type="button"
            onClick={onStartCreate}
            disabled={busy}
            className={actionButton}
          >
            + Tambah Baris
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-outline bg-surface shadow-sm">
        <table className="w-full min-w-[1100px] border-collapse text-xs">
        <thead>
          <tr>
            <th scope="col" className={`${headerCell} w-36`}>
              Kode
            </th>
            <th scope="col" className={`${headerCell} min-w-56`}>
              Nama
            </th>
            <th scope="col" className={`${headerCell} min-w-48`}>
              PIC
            </th>
            <th scope="col" className={`${headerCell} min-w-44`}>
              Evidence
            </th>
            <th scope="col" className={`${headerCell} min-w-56`}>
              Catatan
            </th>
            <th scope="col" className={`${headerCell} w-40 text-right`}>
              Aksi
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) =>
            editing?.id === row.id ? (
              <>
                <tr key={`${row.id}-edit`} className="bg-blue-50/40">
                  <DraftFields
                    idPrefix={`cst-edit-${row.id}`}
                    draft={editing.draft}
                    busy={busy}
                    picOptions={picOptions}
                    picLoading={picLoading}
                    picError={picError}
                    onChange={onEditDraftChange}
                  />
                </tr>
                <tr key={`${row.id}-edit-actions`} className="bg-blue-50/40">
                  <td
                    colSpan={CST_COLUMN_COUNT - 1}
                    className="border-b border-outline/50 px-3 py-2"
                  >
                    {editing.error ? (
                      <p role="alert" className="text-[11px] font-semibold text-red-700">
                        {editing.error}
                      </p>
                    ) : null}
                  </td>
                  <td className={`${bodyCell} whitespace-nowrap text-right`}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={onSaveEdit}
                        disabled={busy}
                        className={primaryButton}
                      >
                        {busy ? "Menyimpan..." : "Simpan"}
                      </button>
                      <button
                        type="button"
                        onClick={onCancelEdit}
                        disabled={busy}
                        aria-label="Batal edit"
                        className={actionButton}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              </>
            ) : (
              <tr key={row.id} className="transition-colors hover:bg-background/60">
                <td className={`${bodyCell} whitespace-nowrap`}>
                  <span className="font-mono text-[11px] font-bold text-primary">
                    {row.kode}
                  </span>
                </td>
                <td className={`${bodyCell} min-w-56`}>
                  <span className="block font-semibold text-primary">{row.nama}</span>
                </td>
                <td className={`${bodyCell} min-w-48`}>
                  <span className="block text-[11px] font-semibold text-primary/75">
                    {picLabel(row.pic)}
                  </span>
                </td>
                <td className={`${bodyCell} min-w-44`}>
                  <EvidenceCell url={row.evidence_url} />
                </td>
                <td className={`${bodyCell} min-w-56`}>
                  <NoteCell value={row.catatan} />
                </td>
                <td className={`${bodyCell} whitespace-nowrap text-right`}>
                  {canManage ? (
                    <ActionCell
                      busy={busy}
                      onEdit={() => onStartEdit(row)}
                      onDelete={() => onDelete(row)}
                    />
                  ) : (
                    <span className="text-primary/40">{EMPTY_VALUE}</span>
                  )}
                </td>
              </tr>
            ),
          )}

          {creating ? (
            <>
              <tr key="new" className="bg-blue-50/40">
                <DraftFields
                  idPrefix="cst-new"
                  draft={creating.draft}
                  busy={busy}
                  picOptions={picOptions}
                  picLoading={picLoading}
                  picError={picError}
                  onChange={onCreateDraftChange}
                />
              </tr>
              <tr key="new-actions" className="bg-blue-50/40">
                <td
                  colSpan={CST_COLUMN_COUNT - 1}
                  className="border-b border-outline/50 px-3 py-2"
                >
                  {creating.error ? (
                    <p role="alert" className="text-[11px] font-semibold text-red-700">
                      {creating.error}
                    </p>
                  ) : null}
                </td>
                <td className={`${bodyCell} whitespace-nowrap text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={onSaveCreate}
                      disabled={busy}
                      className={primaryButton}
                    >
                      {busy ? "Menyimpan..." : "Simpan"}
                    </button>
                    <button
                      type="button"
                      onClick={onCancelCreate}
                      disabled={busy}
                      aria-label="Batal tambah baris"
                      className={actionButton}
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            </>
          ) : null}

          {rows.length === 0 && !creating ? (
            <tr>
              <td
                colSpan={CST_COLUMN_COUNT}
                className="border-b border-outline/50 px-3 py-8 text-center"
              >
                <p className="text-xs font-medium text-primary/60">
                  Belum ada baris untuk kategori ini.
                </p>
              </td>
            </tr>
          ) : null}

        </tbody>
      </table>
      </div>
    </>
  );
}
