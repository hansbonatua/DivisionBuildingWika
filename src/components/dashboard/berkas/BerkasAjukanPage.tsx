"use client";

import { useEffect, useState } from "react";
import BerkasDeleteDialog from "@/components/dashboard/berkas/BerkasDeleteDialog";
import BerkasFormDialog from "@/components/dashboard/berkas/BerkasFormDialog";
import BerkasPagination from "@/components/dashboard/berkas/BerkasPagination";
import BerkasRevisiDialog from "@/components/dashboard/berkas/BerkasRevisiDialog";
import PdfViewerModal from "@/components/dashboard/berkas/PdfViewerModal";
import {
  downloadBerkasFile,
  readApiErrorMessage,
} from "@/components/dashboard/berkas/client";
import {
  BERKAS_STATUS_LABELS,
  berkasStatusClass,
  formatBerkasCreatedDate,
  formatBerkasSize,
  type BerkasDto,
  type BerkasPaginationDto,
} from "@/components/dashboard/berkas/types";

const headerCell =
  "whitespace-nowrap border-b border-outline bg-background px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";
const bodyCell = "border-b border-outline/50 px-4 py-3 align-middle text-xs text-primary/80";
const PAGE_SIZE = 10;

type Feedback = { kind: "success" | "error"; message: string };

export default function BerkasAjukanPage({
  currentUser,
  canCreate,
  canDelete,
  isAdmin,
}: {
  currentUser: { id: string; name: string; position: string };
  canCreate: boolean;
  canDelete: boolean;
  isAdmin: boolean;
}) {
  const [records, setRecords] = useState<BerkasDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<BerkasPaginationDto>({
    page: 1,
    limit: PAGE_SIZE,
    totalData: 0,
    totalPages: 0,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [viewBerkas, setViewBerkas] = useState<BerkasDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BerkasDto | null>(null);
  const [revisionTarget, setRevisionTarget] = useState<BerkasDto | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (search) params.set("search", search);
        const response = await fetch(`/api/berkas?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            await readApiErrorMessage(response, "Gagal memuat data Berkas."),
          );
        }
        const body = (await response.json()) as {
          data?: unknown;
          pagination?: Partial<BerkasPaginationDto>;
        };
        if (!Array.isArray(body.data)) throw new Error("Format data tidak valid.");
        if (!active) return;
        const nextRecords = body.data as BerkasDto[];
        const totalData =
          typeof body.pagination?.totalData === "number"
            ? body.pagination.totalData
            : nextRecords.length;
        const totalPages =
          typeof body.pagination?.totalPages === "number"
            ? body.pagination.totalPages
            : Math.ceil(totalData / PAGE_SIZE);
        setRecords(nextRecords);
        setPagination({
          page:
            typeof body.pagination?.page === "number"
              ? body.pagination.page
              : page,
          limit:
            typeof body.pagination?.limit === "number"
              ? body.pagination.limit
              : PAGE_SIZE,
          totalData,
          totalPages,
        });
      } catch (loadError) {
        if (!active || controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Gagal memuat data Berkas. Periksa koneksi lalu coba lagi.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [page, search, reloadToken]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function reload(): void {
    setReloadToken((value) => value + 1);
  }

  function handleSaved(record: BerkasDto): void {
    setFormOpen(false);
    setFeedback({
      kind: "success",
      message: `Berkas "${record.judul}" berhasil diajukan.`,
    });
    setPage(1);
    reload();
  }

  function handleRevisionSaved(record: BerkasDto): void {
    setRevisionTarget(null);
    setFeedback({
      kind: "success",
      message: `Revisi "${record.judul}" berhasil dikirim dan menunggu TTD Validator 1.`,
    });
    setPage(1);
    reload();
  }

  async function handleDownload(record: BerkasDto): Promise<void> {
    if (downloadingId) return;
    setDownloadingId(record.id);
    setFeedback(null);
    try {
      await downloadBerkasFile(record.id, record.judul);
    } catch (downloadError) {
      setFeedback({
        kind: "error",
        message:
          downloadError instanceof Error
            ? downloadError.message
            : "Gagal mengunduh Berkas.",
      });
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline pb-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
              Core Enterprise
            </span>
            <span className="text-xs text-primary/50">•</span>
            <span className="text-xs text-primary/50">Berkas</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Ajukan Berkas</h1>
          <p className="mt-1 max-w-3xl text-base text-primary/70">
            Ajukan PDF dengan cover tanda tangan penyusun dan dua validator. Status
            diperbarui setelah setiap TTD tersimpan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          disabled={!canCreate}
          title={canCreate ? undefined : "Role Anda hanya dapat melihat Berkas."}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-base leading-none">+</span>
          Ajukan Berkas
        </button>
      </div>

      {feedback ? (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          className={`rounded-lg border px-4 py-3 text-xs font-semibold ${
            feedback.kind === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-semibold text-red-700">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-2 text-xs font-bold text-red-800 underline underline-offset-2"
          >
            Coba lagi
          </button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-outline bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-outline/70 bg-background/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary/40"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              maxLength={100}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari judul, kode seri, atau pemohon..."
              aria-label="Cari Berkas"
              className="h-9 w-full rounded-lg border border-outline bg-white pl-9 pr-3 text-xs font-semibold text-primary placeholder:font-normal placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
          <p className="text-[11px] font-semibold text-primary/60">
            {pagination.totalData} Berkas
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className={`${headerCell} w-14 text-center`}>No</th>
                <th className={headerCell}>Nama Berkas</th>
                <th className={headerCell}>Status</th>
                <th className={headerCell}>File Generate</th>
                <th className={headerCell}>Catatan</th>
                <th className={`${headerCell} w-24 text-center`}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-xs font-semibold text-primary/50">
                    Memuat data Berkas...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-xs font-semibold text-primary/50">
                    {search
                      ? "Tidak ada Berkas yang cocok dengan pencarian."
                      : "Belum ada Berkas yang diajukan."}
                  </td>
                </tr>
              ) : (
                records.map((record, index) => {
                  const canRevise =
                    record.status === "DITOLAK" &&
                    (isAdmin || record.pemohon.id === currentUser.id);
                  return (
                    <tr key={record.id} className="transition-colors hover:bg-background/40">
                      <td className={`${bodyCell} text-center font-semibold text-primary/50`}>
                        {(page - 1) * PAGE_SIZE + index + 1}
                      </td>
                      <td className={bodyCell}>
                        <div className="flex items-start gap-1.5">
                          <span
                            aria-hidden="true"
                            className="text-[10px] leading-4"
                          >
                            🔗
                          </span>
                          <button
                            type="button"
                            onClick={() => setViewBerkas(record)}
                            className="text-left text-xs font-bold text-primary underline-offset-2 hover:text-secondary hover:underline"
                            title="Lihat PDF"
                          >
                            {record.judul}
                          </button>
                        </div>
                        <p className="mt-1 text-xs font-normal text-gray-500">
                          Oleh: {record.pemohon.name}, {formatBerkasCreatedDate(record.createdAt)}
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-primary/45">
                          {record.originalPdf.name} · {formatBerkasSize(record.originalPdf.sizeBytes)}
                        </p>
                      </td>
                      <td className={bodyCell}>
                        <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${berkasStatusClass(record.status)}`}>
                          {BERKAS_STATUS_LABELS[record.status]}
                        </span>
                      </td>
                      <td className={bodyCell}>
                        {record.status === "SELESAI" ? (
                          <button
                            type="button"
                            onClick={() => void handleDownload(record)}
                            disabled={downloadingId === record.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-secondary/25 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-secondary transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 3v12" />
                              <path d="m7 10 5 5 5-5" />
                              <path d="M5 21h14" />
                            </svg>
                            {downloadingId === record.id ? "Menyiapkan..." : "Download"}
                          </button>
                        ) : (
                          <span className="text-primary/35">—</span>
                        )}
                      </td>
                      <td className={`${bodyCell} max-w-xs`}>
                        <span className="line-clamp-2">
                          {record.catatan?.trim() || "—"}
                        </span>
                      </td>
                      <td className={`${bodyCell} text-center`}>
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {canRevise ? (
                            <button
                              type="button"
                              onClick={() => setRevisionTarget(record)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-800 transition-colors hover:bg-red-100"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M21 12a9 9 0 1 1-2.6-6.4" />
                                <path d="M21 3v6h-6" />
                              </svg>
                              Revisi
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(record)}
                              aria-label={`Hapus ${record.judul}`}
                              title={`Hapus ${record.judul}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition-colors hover:bg-red-100"
                            >
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
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="m19 6-1 14H6L5 6" />
                                <path d="M10 11v5" />
                                <path d="M14 11v5" />
                              </svg>
                            </button>
                          ) : null}
                          {!canRevise && !canDelete ? (
                            <span className="text-primary/35">—</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <BerkasPagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalData={pagination.totalData}
          loading={loading}
          onPageChange={setPage}
        />
      </div>

      {formOpen ? (
        <BerkasFormDialog
          currentUser={currentUser}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      ) : null}
      {viewBerkas ? (
        <PdfViewerModal berkas={viewBerkas} onClose={() => setViewBerkas(null)} />
      ) : null}
      {revisionTarget ? (
        <BerkasRevisiDialog
          berkas={revisionTarget}
          actorId={currentUser.id}
          onClose={() => setRevisionTarget(null)}
          onSaved={handleRevisionSaved}
        />
      ) : null}
      {deleteTarget ? (
        <BerkasDeleteDialog
          berkas={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onDeleted={() => {
            const target = deleteTarget;
            if (!target) return;
            setFeedback({
              kind: "success",
              message: `Berkas "${target.judul}" berhasil dihapus.`,
            });
            setDeleteTarget(null);
            if (records.length === 1 && page > 1) {
              setPage(page - 1);
            } else {
              reload();
            }
          }}
        />
      ) : null}
    </div>
  );
}
