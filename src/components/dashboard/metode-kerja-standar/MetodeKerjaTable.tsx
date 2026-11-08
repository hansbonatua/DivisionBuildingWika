"use client";

import { Fragment } from "react";

import type {
  MetodeKerjaItemDto,
  MetodeKerjaPicDto,
  MetodeKerjaSubKategoriDto,
} from "@/lib/metode-kerja-standar/service";

// Three-level Metode Kerja Standar table (P3 Section H).
//
// One <tbody> per discipline: a full-width discipline header row, then one block
// per sub-kategori. The sub-kategori's code and name sit in a single cell that
// spans its own row plus every item row below it (`rowSpan = items.length + 1`),
// so the hierarchy reads as a block instead of repeating the sub-kategori on
// each item. The spanning cell owns column 1, which is why item rows start in
// the "Item" column. A sub-kategori without items keeps rowSpan 1 and shows
// "Belum ada item" under its name.
//
// The pure row helpers at the top are exported so ordering/numbering
// regressions can be tested without a DOM (the repository has no jsdom).

export const EMPTY_VALUE = "—";

// Kode already identifies every row (A.1, A.4.2, …), so the ordinal "No"
// column was removed: seven columns remain.
export const DISIPLIN_ROW_COLUMN_COUNT = 7;

export type MetodeKerjaTableRow =
  | {
      key: string;
      level: 1;
      subKategoriId: string;
      itemId: null;
    }
  | {
      key: string;
      level: 2;
      subKategoriId: string;
      itemId: string;
    };

export function subKategoriRowKey(id: string): string {
  return `sub-${id}`;
}

export function itemRowKey(id: string): string {
  return `item-${id}`;
}

// The merged Sub-Kategori cell covers its own row plus every item row below it.
// Exported so the merge arithmetic is testable without a DOM.
export function subKategoriRowSpan(sub: MetodeKerjaSubKategoriDto): number {
  return sub.items.length + 1;
}

// Display order: each sub-kategori immediately followed by its own items.
export function buildTableRows(
  subKategori: readonly MetodeKerjaSubKategoriDto[],
): MetodeKerjaTableRow[] {
  const rows: MetodeKerjaTableRow[] = [];
  for (const sub of subKategori) {
    rows.push({
      key: subKategoriRowKey(sub.id),
      level: 1,
      subKategoriId: sub.id,
      itemId: null,
    });
    for (const item of sub.items) {
      rows.push({
        key: itemRowKey(item.id),
        level: 2,
        subKategoriId: sub.id,
        itemId: item.id,
      });
    }
  }
  return rows;
}

// Returns a new array with the item moved one slot, or null when the move is
// out of bounds. Never mutates the input.
export function moveWithin<T>(
  items: readonly T[],
  index: number,
  direction: "up" | "down",
): T[] | null {
  if (index < 0 || index >= items.length) return null;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= items.length) return null;

  const next = [...items];
  const moved = next[index] as T;
  next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}

export function subKategoriReorderIds(
  subKategori: readonly MetodeKerjaSubKategoriDto[],
  index: number,
  direction: "up" | "down",
): string[] | null {
  const moved = moveWithin(subKategori, index, direction);
  return moved ? moved.map((row) => row.id) : null;
}

export function itemReorderIds(
  items: readonly MetodeKerjaItemDto[],
  index: number,
  direction: "up" | "down",
): string[] | null {
  const moved = moveWithin(items, index, direction);
  return moved ? moved.map((row) => row.id) : null;
}

export function formatMetodeKerjaDate(iso: string | null): string {
  if (!iso) return EMPTY_VALUE;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const headerCell =
  "whitespace-nowrap border-b border-outline bg-background px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";
// Compact rhythm: rows must stay scannable when a sub-kategori carries PIC
// chips, an evidence link and a note. Vertical padding is py-2 (not py-3) and
// every action control is h-7, so a row's height is driven by its content
// instead of by the toolbar.
const bodyCell =
  "border-b border-outline/50 px-3 py-2 align-top text-xs text-primary/80";
// The action cell is aligned independently: when another cell in the row is
// taller (e.g. several PIC chips), centred buttons stay visually attached to
// the row instead of floating at its top edge.
const actionBodyCell =
  "border-b border-outline/50 px-3 py-2 align-middle text-xs text-primary/80";
const actionCell = "flex items-center justify-end gap-1 whitespace-nowrap";
// `shrink-0` keeps every control on one line: without it the flex row can
// squeeze a button narrower than its label and the text wraps inside h-7.
const actionButton =
  "inline-flex h-7 shrink-0 items-center justify-center rounded-md border border-outline bg-white px-2 text-[11px] font-bold leading-none text-primary/70 transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40";
const reorderButton =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-outline bg-white text-[12px] font-bold leading-none text-primary/70 transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40";
const dangerButton =
  "inline-flex h-7 shrink-0 items-center justify-center rounded-md border border-red-200 bg-white px-2 text-[11px] font-bold leading-none text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40";

function PicChips({ pics }: { pics: MetodeKerjaPicDto[] }) {
  if (pics.length === 0) {
    return <span className="text-primary/40">{EMPTY_VALUE}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {pics.map((pic) => (
        <span
          key={pic.user_id}
          className="rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold leading-tight text-primary/70"
        >
          {pic.name}
          {pic.status !== "active" ? (
            <span className="ml-1 font-medium text-primary/40">(non-aktif)</span>
          ) : null}
        </span>
      ))}
    </div>
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

function NoteCell({ note }: { note: string | null }) {
  if (!note) return <span className="text-primary/40">{EMPTY_VALUE}</span>;
  return (
    <span
      title={note}
      className="block max-w-[220px] overflow-hidden text-[11px] font-medium leading-snug text-primary/70 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
    >
      {note}
    </span>
  );
}

export default function MetodeKerjaTable({
  disiplinCode,
  disiplinName,
  subKategori,
  canManage,
  canDelete,
  reorderBusyKey,
  onAddSubKategori,
  onAddItem,
  onEditSubKategori,
  onEditItem,
  onDeleteSubKategori,
  onDeleteItem,
  onReorderSubKategori,
  onReorderItem,
}: {
  disiplinCode: string;
  disiplinName: string;
  subKategori: MetodeKerjaSubKategoriDto[];
  canManage: boolean;
  canDelete: boolean;
  reorderBusyKey: string | null;
  onAddSubKategori: () => void;
  onAddItem: (sub: MetodeKerjaSubKategoriDto) => void;
  onEditSubKategori: (sub: MetodeKerjaSubKategoriDto) => void;
  onEditItem: (sub: MetodeKerjaSubKategoriDto, item: MetodeKerjaItemDto) => void;
  onDeleteSubKategori: (sub: MetodeKerjaSubKategoriDto) => void;
  onDeleteItem: (sub: MetodeKerjaSubKategoriDto, item: MetodeKerjaItemDto) => void;
  onReorderSubKategori: (
    sub: MetodeKerjaSubKategoriDto,
    direction: "up" | "down",
  ) => void;
  onReorderItem: (
    sub: MetodeKerjaSubKategoriDto,
    item: MetodeKerjaItemDto,
    direction: "up" | "down",
  ) => void;
}) {
  const reorderBusy = reorderBusyKey !== null;

  return (
    <TableFrame
      disiplinCode={disiplinCode}
      disiplinName={disiplinName}
      subKategoriCount={subKategori.length}
    >
      <tbody>
        <tr>
          <th
            colSpan={DISIPLIN_ROW_COLUMN_COUNT}
            scope="colgroup"
            className="border-b border-outline bg-primary px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-white"
          >
            {disiplinCode}. {disiplinName.toUpperCase()}
          </th>
        </tr>

        {subKategori.length === 0 ? (
          <tr>
            <td
              colSpan={DISIPLIN_ROW_COLUMN_COUNT}
              className="border-b border-outline/50 px-3 py-10 text-center"
            >
              <p className="text-sm font-bold text-primary">Belum ada sub-kategori.</p>
              <p className="mt-1 text-xs text-primary/60">
                {canManage
                  ? "Tambahkan sub-kategori pertama untuk disiplin ini."
                  : "Belum ada data yang dapat ditampilkan."}
              </p>
              {canManage ? (
                <button
                  type="button"
                  onClick={onAddSubKategori}
                  className="mt-3 rounded-lg bg-primary px-4 py-2 text-[11px] font-bold text-white transition-colors hover:bg-secondary"
                >
                  Tambah Sub-Kategori
                </button>
              ) : null}
            </td>
          </tr>
        ) : (
          subKategori.map((sub, subIndex) => {
            const items = sub.items;
            return (
              <Fragment key={sub.id}>
                {/* Level 1: the merged cell owns column 1 for this block, so the
                    remaining cells start at the "Item" column. A light blue tint
                    keeps the three levels readable: discipline header (dark),
                    sub-kategori rail (blue), items (white). */}
                <tr className="bg-blue-50 transition-colors hover:bg-blue-100/70">
                  <th
                    scope="rowgroup"
                    rowSpan={subKategoriRowSpan(sub)}
                    className="border-b border-outline/50 bg-blue-50 px-3 py-2 align-top text-left text-xs font-normal text-primary/80"
                  >
                    <span className="block font-mono text-[11px] font-bold text-blue-800">
                      {sub.kode}
                    </span>
                    <span className="mt-0.5 block font-bold text-blue-900">
                      {sub.nama}
                    </span>
                    {items.length === 0 ? (
                      <span className="mt-0.5 block text-[11px] font-medium italic text-amber-700">
                        Belum ada item
                      </span>
                    ) : null}
                  </th>
                  {/* A sub-kategori has no item of its own. */}
                  <td className={bodyCell}>
                    <span className="text-primary/40">{EMPTY_VALUE}</span>
                  </td>
                  <td className={`${bodyCell} min-w-[170px]`}>
                    <PicChips pics={sub.pics} />
                  </td>
                  <td className={`${bodyCell} min-w-[150px]`}>
                    <EvidenceCell url={sub.evidence_url} />
                  </td>
                  <td className={`${bodyCell} min-w-[170px]`}>
                    <NoteCell note={sub.note} />
                  </td>
                  <td className={`${bodyCell} tabular-nums text-primary/60`}>
                    {items.length}
                  </td>
                  <td className={`${actionBodyCell} whitespace-nowrap text-right`}>
                    <div className={actionCell}>
                      {canManage ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onAddItem(sub)}
                            aria-label={`Tambah item di bawah ${sub.nama}`}
                            className={actionButton}
                          >
                            + Item
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditSubKategori(sub)}
                            aria-label={`Edit sub-kategori ${sub.nama}`}
                            className={actionButton}
                          >
                            Edit
                          </button>
                        </>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => onDeleteSubKategori(sub)}
                          aria-label={`Hapus sub-kategori ${sub.nama}`}
                          className={dangerButton}
                        >
                          Hapus
                        </button>
                      ) : null}
                      {canManage ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onReorderSubKategori(sub, "up")}
                            disabled={subIndex === 0 || reorderBusy}
                            aria-label={`Naikkan ${sub.nama}`}
                            title="Naikkan"
                            className={reorderButton}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => onReorderSubKategori(sub, "down")}
                            disabled={
                              subIndex === subKategori.length - 1 || reorderBusy
                            }
                            aria-label={`Turunkan ${sub.nama}`}
                            title="Turunkan"
                            className={reorderButton}
                          >
                            ↓
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>

                {items.map((item, itemIndex) => (
                  <tr
                    key={item.id}
                    className="bg-white transition-colors hover:bg-background/60"
                  >
                    {/* Column 1 is covered by the sub-kategori cell above, so
                        the item's code and name share the "Item" column. */}
                    <th scope="row" className={`${bodyCell} text-left`}>
                      <span className="block font-mono text-[11px] font-medium text-primary/60">
                        {item.kode}
                      </span>
                      <span className="mt-0.5 block font-medium text-primary/90">
                        {item.nama}
                      </span>
                    </th>
                    <td className={`${bodyCell} min-w-[170px]`}>
                      <PicChips pics={item.pics} />
                    </td>
                    <td className={`${bodyCell} min-w-[150px]`}>
                      <EvidenceCell url={item.evidence_url} />
                    </td>
                    <td className={`${bodyCell} min-w-[170px]`}>
                      <NoteCell note={item.note} />
                    </td>
                    <td className={`${bodyCell} text-primary/40`}>{EMPTY_VALUE}</td>
                    <td className={`${bodyCell} whitespace-nowrap text-right`}>
                      <div className={actionCell}>
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => onEditItem(sub, item)}
                            aria-label={`Edit item ${item.nama}`}
                            className={actionButton}
                          >
                            Edit
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => onDeleteItem(sub, item)}
                            aria-label={`Hapus item ${item.nama}`}
                            className={dangerButton}
                          >
                            Hapus
                          </button>
                        ) : null}
                        {canManage ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onReorderItem(sub, item, "up")}
                              disabled={itemIndex === 0 || reorderBusy}
                              aria-label={`Naikkan ${item.nama}`}
                              title="Naikkan"
                              className={reorderButton}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onReorderItem(sub, item, "down")
                              }
                              disabled={
                                itemIndex === items.length - 1 || reorderBusy
                              }
                              aria-label={`Turunkan ${item.nama}`}
                              title="Turunkan"
                              className={reorderButton}
                            >
                              ↓
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </Fragment>
            );
          })
        )}
      </tbody>
    </TableFrame>
  );
}

// A tbody can only hold <tr> children, so grouping a sub-kategori with its item
// rows uses a Fragment rather than a wrapper element. Fragment imports are
// handled above.
function TableFrame({
  disiplinCode,
  disiplinName,
  subKategoriCount,
  children,
}: {
  disiplinCode: string;
  disiplinName: string;
  subKategoriCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-outline/60 bg-white shadow-sm">
      <table className="w-full min-w-[1290px] border-collapse text-left">
        <caption className="sr-only">
          Metode Kerja Standar — Disiplin {disiplinCode}. {disiplinName}.{" "}
          {subKategoriCount} sub-kategori.
        </caption>
        <thead className="sticky top-0 z-20">
          <tr>
            <th scope="col" className={`${headerCell} min-w-[260px]`}>
              Sub-Kategori
            </th>
            <th scope="col" className={`${headerCell} min-w-[240px]`}>
              Item
            </th>
            <th scope="col" className={`${headerCell} min-w-[170px]`}>
              PIC
            </th>
            <th scope="col" className={`${headerCell} min-w-[150px]`}>
              Evidence
            </th>
            <th scope="col" className={`${headerCell} min-w-[170px]`}>
              Catatan
            </th>
            <th scope="col" className={`${headerCell} w-[64px]`}>
              Jumlah
            </th>
            <th scope="col" className={`${headerCell} w-[240px] text-right`}>
              Aksi
            </th>
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}
