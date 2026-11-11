"use client";

import { useEffect, useMemo, useState } from "react";
import BerkasPagination from "@/components/dashboard/berkas/BerkasPagination";
import BerkasRejectDialog from "@/components/dashboard/berkas/BerkasRejectDialog";
import BerkasTtdDialog from "@/components/dashboard/berkas/BerkasTtdDialog";
import PdfViewerModal from "@/components/dashboard/berkas/PdfViewerModal";
import { readApiErrorMessage } from "@/components/dashboard/berkas/client";
import {
  BERKAS_STATUS_LABELS,
  berkasStatusClass,
  canSignBerkas,
  type BerkasAssignmentDto,
  type BerkasDto,
  type BerkasPaginationDto,
} from "@/components/dashboard/berkas/types";

const headerCell =
  "whitespace-nowrap border-b border-outline bg-background px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";
const bodyCell = "border-b border-outline/50 px-4 py-3 align-middle text-xs text-primary/80";
const PAGE_SIZE = 10;

type Feedback = { kind: "success" | "error"; message: string };
type TtdTarget = { berkas: BerkasDto; urutan: 1 | 2 };

export default function BerkasVerifikasiPage({
  isAdmin,
  canValidate,
}: {
  isAdmin: boolean;
  canValidate: boolean;
}) {
  const [records, setRecords] = useState<BerkasDto[]>([]);
  const [assignments, setAssignments] = useState<BerkasAssignmentDto[]>([]);
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
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [viewBerkas, setViewBerkas] = useState<BerkasDto | null>(null);
  const [ttdTarget, setTtdTarget] = useState<TtdTarget | null>(null);
  const [rejectTarget, setRejectTarget] = useState<BerkasDto | null>(null);

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
          assignments?: unknown;
          pagination?: Partial<BerkasPaginationDto>;
        };
        if (!Array.isArray(body.data)) throw new Error("Format data tidak valid.");
        if (!active) return;
        const nextRecords = body.data as BerkasDto[];
        const nextAssignments = Array.isArray(body.assignments)
          ? body.assignments.filter(
              (item): item is BerkasAssignmentDto =>
                typeof item === "object" &&
                item !== null &&
                typeof (item as BerkasAssignmentDto).berkasId === "string" &&
                typeof (item as BerkasAssignmentDto).urutan === "number" &&
                (typeof (item as BerkasAssignmentDto).ttdUploadedAt === "string" ||
                  (item as BerkasAssignmentDto).ttdUploadedAt === null),
            )
          : [];
        const totalData =
          typeof body.pagination?.totalData === "number"
            ? body.pagination.totalData
            : nextRecords.length;
        const totalPages =
          typeof body.pagination?.totalPages === "number"
            ? body.pagination.totalPages
            : Math.ceil(totalData / PAGE_SIZE);
        setRecords(nextRecords);
        setAssignments(nextAssignments);
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

  const assignmentsByBerkas = useMemo(
    () => new Map(assignments.map((assignment) => [assignment.berkasId, assignment])),
    [assignments],
  );

  function reload(): void {
    setReloadToken((value) => value + 1);
  }

  function handleTtdSaved(): void {
    if (!ttdTarget) return;
    const saved = ttdTarget;
    setTtdTarget(null);
    setFeedback({
      kind: "success",
      message: `TTD Validator ${saved.urutan} untuk "${saved.berkas.judul}" berhasil disimpan.`,
    });
    reload();
  }

  function handleRejectSaved(): void {
    if (!rejectTarget) return;
    const saved = rejectTarget;
    setRejectTarget(null);
    setFeedback({
      kind: "success",
      message: `Berkas "${saved.judul}" berhasil ditolak.`,
    });
    reload();
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-outline pb-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
            Core Enterprise
          </span>
          <span className="text-xs text-primary/50">•</span>
          <span className="text-xs text-primary/50">Berkas</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Verifikasi Berkas</h1>
        <p className="mt-1 max-w-3xl text-base text-primary/70">
          Tanda tangani Berkas yang ditugaskan kepada Anda sesuai urutan validator.
          Tombol TTD hanya muncul untuk penanda tangan yang tepat.
        </p>
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
              aria-label="Cari Berkas untuk diverifikasi"
              className="h-9 w-full rounded-lg border border-outline bg-white pl-9 pr-3 text-xs font-semibold text-primary placeholder:font-normal placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
          <p className="text-[11px] font-semibold text-primary/60">
            {pagination.totalData} pengajuan
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className={`${headerCell} w-14 text-center`}>No</th>
                <th className={headerCell}>Nama Berkas</th>
                <th className={headerCell}>Diajukan Oleh</th>
                <th className={headerCell}>Status</th>
                <th className={headerCell}>Catatan</th>
                <th className={headerCell}>Aksi</th>
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
                      : "Belum ada Berkas untuk diverifikasi."}
                  </td>
                </tr>
              ) : (
                records.map((record, index) => {
                  const assignment = assignmentsByBerkas.get(record.id);
                  const isWaiting =
                    record.status === "MENUNGGU_TTD_1" ||
                    record.status === "MENUNGGU_TTD_2";
                  const canSign =
                    isWaiting && canSignBerkas(record.status, assignment);
                  const canReject =
                    isWaiting &&
                    (isAdmin ||
                      (canValidate && canSignBerkas(record.status, assignment)));
                  const rejectionNote = record.rejectionReason?.trim();
                  return (
                    <tr key={record.id} className="transition-colors hover:bg-background/40">
                      <td className={`${bodyCell} text-center font-semibold text-primary/50`}>
                        {(page - 1) * PAGE_SIZE + index + 1}
                      </td>
                      <td className={bodyCell}>
                        <button
                          type="button"
                          onClick={() => setViewBerkas(record)}
                          className="text-left text-xs font-bold text-primary underline-offset-2 hover:text-secondary hover:underline"
                          title="Lihat PDF"
                        >
                          {record.judul}
                        </button>
                      </td>
                      <td className={bodyCell}>{record.pemohon.name}</td>
                      <td className={bodyCell}>
                        <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${berkasStatusClass(record.status)}`}>
                          {BERKAS_STATUS_LABELS[record.status]}
                        </span>
                      </td>
                      <td className={`${bodyCell} max-w-xs`}>
                        {record.status === "DITOLAK" ? (
                          <span
                            className="line-clamp-2 text-red-800"
                            title={rejectionNote || undefined}
                          >
                            {rejectionNote || "—"}
                          </span>
                        ) : (
                          <span className="line-clamp-2">
                            {record.catatan?.trim() || "—"}
                          </span>
                        )}
                      </td>
                      <td className={bodyCell}>
                        {canSign || canReject ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {canSign && assignment ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setTtdTarget({
                                    berkas: record,
                                    urutan: assignment.urutan === 1 ? 1 : 2,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-secondary/25 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-secondary transition-colors hover:bg-blue-100"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                                </svg>
                                Upload TTD {assignment.urutan}
                              </button>
                            ) : null}
                            {canReject ? (
                              <button
                                type="button"
                                onClick={() => setRejectTarget(record)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-800 transition-colors hover:bg-red-100"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M18 6 6 18" />
                                  <path d="m6 6 12 12" />
                                </svg>
                                Tolak
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-primary/35">—</span>
                        )}
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

      {viewBerkas ? (
        <PdfViewerModal berkas={viewBerkas} onClose={() => setViewBerkas(null)} />
      ) : null}
      {ttdTarget ? (
        <BerkasTtdDialog
          berkas={ttdTarget.berkas}
          urutan={ttdTarget.urutan}
          onClose={() => setTtdTarget(null)}
          onSaved={handleTtdSaved}
        />
      ) : null}
      {rejectTarget ? (
        <BerkasRejectDialog
          berkas={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onSaved={handleRejectSaved}
        />
      ) : null}
    </div>
  );
}
