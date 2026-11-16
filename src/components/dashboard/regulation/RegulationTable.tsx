"use client";

import { Fragment } from "react";
import type {
  RegulationDocumentDto,
  RegulationSubKategoriDto,
} from "@/lib/regulation/service";
import {
  formatRegulationFileSize,
  regulationFileTypeLabel,
} from "@/components/dashboard/regulation/regulation-ui";

// New Standard & Regulation table. It deliberately shares no component with
// Metode Kerja Standar: the hierarchy here is only two levels (sub-kategori and
// document) and every document has a private download plus file metadata.

export const REGULATION_COLUMN_COUNT = 7;
export const EMPTY_VALUE = "—";

export function subKategoriRowSpan(sub: RegulationSubKategoriDto): number {
  return sub.documents.length + 1;
}

function FileBadge({ fileName }: { fileName: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-secondary">
      {regulationFileTypeLabel(fileName)}
    </span>
  );
}

function DownloadIcon() {
  return (
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
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function NoteCell({ note }: { note: string | null }) {
  if (!note) return <span className="text-primary/35">{EMPTY_VALUE}</span>;
  return (
    <span
      title={note}
      className="block max-w-[220px] overflow-hidden text-[11px] font-medium leading-snug text-primary/70 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
    >
      {note}
    </span>
  );
}

function FileCell({ document }: { document: RegulationDocumentDto }) {
  return (
    <div className="min-w-[170px]">
      <div className="flex items-center gap-1.5">
        <FileBadge fileName={document.file_name} />
        <a
          href={`/api/regulation/document/${document.id}/file`}
          title={`Unduh ${document.file_name}`}
          className="min-w-0 break-all text-[11px] font-semibold text-secondary underline decoration-secondary/30 underline-offset-2 hover:decoration-secondary"
        >
          {document.file_name}
        </a>
      </div>
      <p className="mt-0.5 text-[10px] font-medium text-primary/45">
        {formatRegulationFileSize(document.file_size_bytes)}
      </p>
    </div>
  );
}

const headerCell =
  "whitespace-nowrap border-b border-outline bg-background px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";
const bodyCell =
  "border-b border-outline/50 px-3 py-2 align-top text-xs text-primary/80";
const actionBodyCell =
  "border-b border-outline/50 px-3 py-2 align-middle text-xs text-primary/80";
const actionCell = "flex items-center justify-end gap-1 whitespace-nowrap";
const actionButton =
  "inline-flex h-7 shrink-0 items-center justify-center rounded-md border border-outline bg-white px-2 text-[11px] font-bold leading-none text-primary/70 transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40";
const dangerButton =
  "inline-flex h-7 shrink-0 items-center justify-center rounded-md border border-red-200 bg-white px-2 text-[11px] font-bold leading-none text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40";
const iconButton =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-outline bg-white text-primary/70 transition-colors hover:bg-background";

function SubKategoriActions({
  sub,
  canManage,
  onAddDocument,
  onEditSubKategori,
  onDeleteSubKategori,
}: {
  sub: RegulationSubKategoriDto;
  canManage: boolean;
  onAddDocument: (sub: RegulationSubKategoriDto) => void;
  onEditSubKategori: (sub: RegulationSubKategoriDto) => void;
  onDeleteSubKategori: (sub: RegulationSubKategoriDto) => void;
}) {
  if (!canManage) {
    return <span className="text-[11px] text-primary/35">Mode baca</span>;
  }
  return (
    <div className={actionCell}>
      <button
        type="button"
        onClick={() => onAddDocument(sub)}
        aria-label={`Tambah dokumen di bawah ${sub.nama}`}
        className={actionButton}
      >
        + Dokumen
      </button>
      <button
        type="button"
        onClick={() => onEditSubKategori(sub)}
        aria-label={`Edit sub-kategori ${sub.nama}`}
        className={actionButton}
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => onDeleteSubKategori(sub)}
        aria-label={`Hapus sub-kategori ${sub.nama}`}
        className={dangerButton}
      >
        Hapus
      </button>
    </div>
  );
}

export default function RegulationTable({
  subKategori,
  canManage,
  onAddSubKategori,
  onAddDocument,
  onEditSubKategori,
  onEditDocument,
  onDeleteSubKategori,
  onDeleteDocument,
}: {
  subKategori: RegulationSubKategoriDto[];
  canManage: boolean;
  onAddSubKategori: () => void;
  onAddDocument: (sub: RegulationSubKategoriDto) => void;
  onEditSubKategori: (sub: RegulationSubKategoriDto) => void;
  onEditDocument: (
    sub: RegulationSubKategoriDto,
    document: RegulationDocumentDto,
  ) => void;
  onDeleteSubKategori: (sub: RegulationSubKategoriDto) => void;
  onDeleteDocument: (
    sub: RegulationSubKategoriDto,
    document: RegulationDocumentDto,
  ) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-outline/60 bg-white shadow-sm">
      <table className="w-full min-w-[1080px] border-collapse text-left">
        <caption className="sr-only">
          Standard &amp; Regulation. {subKategori.length} sub-kategori. Tabel
          berisi nomor, sub-kategori, kode dokumen, judul dokumen, file, catatan,
          dan aksi.
        </caption>
        <thead className="sticky top-0 z-20">
          <tr>
            <th scope="col" className={`${headerCell} w-[52px]`}>
              No
            </th>
            <th scope="col" className={`${headerCell} min-w-[230px]`}>
              Sub-Kategori
            </th>
            <th scope="col" className={`${headerCell} min-w-[130px]`}>
              Kode Dokumen
            </th>
            <th scope="col" className={`${headerCell} min-w-[210px]`}>
              Judul Dokumen
            </th>
            <th scope="col" className={`${headerCell} min-w-[220px]`}>
              File (Nama &amp; Ukuran)
            </th>
            <th scope="col" className={`${headerCell} min-w-[180px]`}>
              Catatan
            </th>
            <th scope="col" className={`${headerCell} w-[220px] text-right`}>
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {subKategori.length === 0 ? (
            <tr>
              <td
                colSpan={REGULATION_COLUMN_COUNT}
                className="border-b border-outline/50 px-3 py-12 text-center"
              >
                <p className="text-sm font-bold text-primary">
                  Belum ada sub-kategori
                </p>
                <p className="mt-1 text-xs text-primary/60">
                  {canManage
                    ? "Tambahkan sub-kategori pertama untuk mulai menyimpan dokumen."
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
              const documents = sub.documents;
              return (
                <Fragment key={sub.id}>
                  <tr className="bg-blue-50 transition-colors hover:bg-blue-100/70">
                    <td className={`${bodyCell} font-mono font-bold text-primary/55`}>
                      {subIndex + 1}
                    </td>
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
                      <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                        {documents.length} dokumen
                      </span>
                    </th>
                    <td className={bodyCell}>
                      <span className="text-primary/35">{EMPTY_VALUE}</span>
                    </td>
                    <td className={bodyCell}>
                      {documents.length === 0 ? (
                        <span className="text-[11px] font-medium italic text-amber-700">
                          Belum ada dokumen
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-primary/50">
                          Sub-kategori
                        </span>
                      )}
                    </td>
                    <td className={bodyCell}>
                      <span className="text-[11px] font-medium text-primary/50">
                        {documents.length === 0
                          ? EMPTY_VALUE
                          : `${documents.length} file`}
                      </span>
                    </td>
                    <td className={bodyCell}>
                      <NoteCell note={sub.note} />
                    </td>
                    <td className={`${actionBodyCell} text-right`}>
                      <SubKategoriActions
                        sub={sub}
                        canManage={canManage}
                        onAddDocument={onAddDocument}
                        onEditSubKategori={onEditSubKategori}
                        onDeleteSubKategori={onDeleteSubKategori}
                      />
                    </td>
                  </tr>

                  {documents.map((document, documentIndex) => (
                    <tr
                      key={document.id}
                      className="bg-white transition-colors hover:bg-background/60"
                    >
                      <td className={`${bodyCell} font-mono text-primary/45`}>
                        {subIndex + 1}.{documentIndex + 1}
                      </td>
                      <td className={`${bodyCell} font-mono text-[11px] font-medium text-primary/60`}>
                        {document.kode}
                      </td>
                      <td className={`${bodyCell} font-semibold text-primary/90`}>
                        {document.nama}
                      </td>
                      <td className={`${bodyCell} min-w-[200px]`}>
                        <FileCell document={document} />
                      </td>
                      <td className={bodyCell}>
                        <NoteCell note={document.note} />
                      </td>
                      <td className={`${actionBodyCell} text-right`}>
                        <div className={actionCell}>
                          <a
                            href={`/api/regulation/document/${document.id}/file`}
                            aria-label={`Unduh ${document.nama}`}
                            title={`Unduh ${document.file_name}`}
                            className={iconButton}
                          >
                            <DownloadIcon />
                          </a>
                          {canManage ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  onEditDocument(sub, document)
                                }
                                aria-label={`Edit dokumen ${document.nama}`}
                                className={actionButton}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onDeleteDocument(sub, document)
                                }
                                aria-label={`Hapus dokumen ${document.nama}`}
                                className={dangerButton}
                              >
                                Hapus
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
      </table>
    </div>
  );
}
