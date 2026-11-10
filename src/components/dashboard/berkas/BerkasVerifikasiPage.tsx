"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BerkasTtdDialog from "@/components/dashboard/berkas/BerkasTtdDialog";
import PdfViewerModal from "@/components/dashboard/berkas/PdfViewerModal";
import { readApiErrorMessage } from "@/components/dashboard/berkas/client";
import {
  BERKAS_STATUS_LABELS,
  berkasStatusClass,
  canSignBerkas,
  type BerkasAssignmentDto,
  type BerkasDto,
} from "@/components/dashboard/berkas/types";

const headerCell =
  "whitespace-nowrap border-b border-outline bg-background px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";
const bodyCell = "border-b border-outline/50 px-4 py-3 align-middle text-xs text-primary/80";

type Feedback = { kind: "success" | "error"; message: string };
type TtdTarget = { berkas: BerkasDto; urutan: 1 | 2 };

export default function BerkasVerifikasiPage() {
  const [records, setRecords] = useState<BerkasDto[]>([]);
  const [assignments, setAssignments] = useState<BerkasAssignmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [viewBerkas, setViewBerkas] = useState<BerkasDto | null>(null);
  const [ttdTarget, setTtdTarget] = useState<TtdTarget | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/berkas", {
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
        };
        if (!Array.isArray(body.data)) throw new Error("Format data tidak valid.");
        if (!active) return;
        setRecords(body.data as BerkasDto[]);
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
        setAssignments(nextAssignments);
        hasLoadedRef.current = true;
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
  }, [reloadToken]);

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
    setLoading(!hasLoadedRef.current);
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
        <div className="border-b border-outline/70 bg-background/50 px-4 py-3">
          <p className="text-[11px] font-semibold text-primary/60">
            Daftar Berkas · {records.length} pengajuan
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
                    Belum ada Berkas untuk diverifikasi.
                  </td>
                </tr>
              ) : (
                records.map((record, index) => {
                  const assignment = assignmentsByBerkas.get(record.id);
                  const canSign = canSignBerkas(record.status, assignment);
                  return (
                    <tr key={record.id} className="transition-colors hover:bg-background/40">
                      <td className={`${bodyCell} text-center font-semibold text-primary/50`}>
                        {index + 1}
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
                        <span className="line-clamp-2">
                          {record.catatan?.trim() || "—"}
                        </span>
                      </td>
                      <td className={bodyCell}>
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
    </div>
  );
}
