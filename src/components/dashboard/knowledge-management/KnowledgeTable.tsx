"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { canManageKnowledgeManagement } from "@/lib/knowledge-management/access";
import {
  KNOWLEDGE_TYPE_LABELS,
  type KnowledgeType,
} from "@/lib/knowledge-management/schema";
import KnowledgeFormDialog from "@/components/dashboard/knowledge-management/KnowledgeFormDialog";
import {
  EMPTY_VALUE,
  formatKnowledgeDate,
  groupKnowledgeRecords,
  type KnowledgeRecordDto,
} from "@/components/dashboard/knowledge-management/types";

type FormState =
  | { mode: "create" }
  | { mode: "edit"; record: KnowledgeRecordDto };

type Feedback = { kind: "success"; message: string };

const headerCell =
  "whitespace-nowrap border-b border-outline bg-background px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";
const bodyCell = "border-b border-outline/50 px-4 py-3 align-top text-xs text-primary/80";
const projectCell =
  "border-b border-outline/50 bg-background/50 px-4 py-3 align-top text-xs text-primary";

export default function KnowledgeTable({
  knowledgeType,
  currentUserRole,
}: {
  knowledgeType: KnowledgeType;
  currentUserRole: string;
}) {
  const [records, setRecords] = useState<KnowledgeRecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);
  const canManage = canManageKnowledgeManagement(currentUserRole);
  const label = KNOWLEDGE_TYPE_LABELS[knowledgeType];

  useEffect(() => {
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let active = true;

    async function loadRecords(): Promise<void> {
      if (hasLoadedRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const response = await fetch(
          `/api/knowledge-management?type=${encodeURIComponent(knowledgeType)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const body = (await response.json()) as { data?: unknown };
        if (!Array.isArray(body.data)) {
          throw new Error("INVALID_RESPONSE");
        }
        if (!active || requestId !== requestIdRef.current) {
          return;
        }
        setRecords(body.data as KnowledgeRecordDto[]);
        hasLoadedRef.current = true;
      } catch {
        if (!active || controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        setError("Gagal memuat data Knowledge Management. Periksa koneksi lalu coba lagi.");
      } finally {
        if (active && requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadRecords();

    return () => {
      active = false;
      controller.abort();
    };
  }, [knowledgeType, reloadToken]);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const groups = useMemo(() => groupKnowledgeRecords(records), [records]);

  function handleSaved(): void {
    setFormState(null);
    setFeedback({ kind: "success", message: "Data Knowledge Management berhasil disimpan." });
    setReloadToken((value) => value + 1);
  }

  function handleDeleted(): void {
    setFormState(null);
    setFeedback({ kind: "success", message: "Data Knowledge Management berhasil dihapus." });
    setReloadToken((value) => value + 1);
  }

  function retryLoad(): void {
    setLoading(records.length === 0);
    setReloadToken((value) => value + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-bold text-primary">Daftar {label}</h2>
          <p className="mt-0.5 text-xs text-primary/50">
            {records.length} record pada {groups.length} Master Project.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!loading ? (
            <span aria-live="polite" className="text-[11px] font-semibold text-secondary">
              {refreshing ? "Memperbarui data..." : ""}
            </span>
          ) : null}
          {!canManage ? (
            <span className="rounded-full bg-background px-3 py-1 text-[11px] font-semibold text-primary/60">
              Mode baca
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setFormState({ mode: "create" })}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all duration-150 hover:bg-secondary"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              <span>Tambah {label}</span>
            </button>
          )}
        </div>
      </div>

      {feedback ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-semibold text-green-800"
        >
          {feedback.message}
        </div>
      ) : null}

      {error && records.length > 0 ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={retryLoad}
            className="rounded border border-red-300 bg-white px-3 py-1.5 font-bold text-red-700 transition-colors hover:bg-red-100"
          >
            Coba Lagi
          </button>
        </div>
      ) : null}

      <section className="rounded-2xl border border-outline/60 bg-white shadow-sm">
        {loading && records.length === 0 ? (
          <div className="space-y-3 p-6" aria-live="polite">
            <p className="text-xs font-medium text-primary/60">Memuat data {label}...</p>
            <div className="h-10 animate-pulse rounded-lg bg-background" />
            <div className="h-16 animate-pulse rounded-lg bg-background" />
            <div className="h-16 animate-pulse rounded-lg bg-background" />
          </div>
        ) : error && records.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-bold text-primary">Gagal memuat data {label}.</p>
            <p className="mt-1 text-xs text-primary/60">Periksa koneksi lalu coba kembali.</p>
            <button
              type="button"
              onClick={retryLoad}
              className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
            >
              Coba Lagi
            </button>
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-bold text-primary">Belum ada {label}.</p>
            <p className="mt-1 text-xs text-primary/60">
              {canManage
                ? "Tambahkan record pertama berdasarkan Master Project."
                : "Belum ada record yang dapat ditampilkan."}
            </p>
            {canManage ? (
              <button
                type="button"
                onClick={() => setFormState({ mode: "create" })}
                className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
              >
                Tambah {label}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left">
              <caption className="sr-only">Daftar {label} per Master Project</caption>
              <thead>
                <tr>
                  <th scope="col" className={headerCell}>No</th>
                  <th scope="col" className={headerCell}>Master Project</th>
                  <th scope="col" className={headerCell}>Knowledge Content</th>
                  <th scope="col" className={headerCell}>PIC</th>
                  <th scope="col" className={headerCell}>Evidence</th>
                  <th scope="col" className={headerCell}>Record History</th>
                  {canManage ? (
                    <th scope="col" className={`${headerCell} text-right`}>
                      Aksi
                    </th>
                  ) : null}
                </tr>
              </thead>

              {(() => {
                let rowNumber = 0;
                return groups.map((group) => (
                  <tbody key={group.project.project_id}>
                    {group.records.map((record, index) => {
                      rowNumber += 1;
                      return (
                        <tr key={record.id} className="transition-colors hover:bg-background/60">
                          <td className={`${bodyCell} tabular-nums text-primary/50`}>
                            {rowNumber}
                          </td>

                          {index === 0 ? (
                            <th
                              scope="rowgroup"
                              rowSpan={group.records.length}
                              className={projectCell}
                            >
                              <span className="block font-bold text-primary">
                                {group.project.name}
                              </span>
                              <span className="mt-1 block text-[11px] font-medium text-primary/50">
                                {group.project.location} · {group.project.year}
                              </span>
                            </th>
                          ) : null}

                          <td className={`${bodyCell} max-w-[380px]`}>
                            <span className="block whitespace-pre-wrap leading-relaxed">
                              {record.content}
                            </span>
                          </td>

                          <td className={`${bodyCell} min-w-[190px]`}>
                            <div className="flex flex-wrap gap-1">
                              {record.pics.map((pic) => (
                                <span
                                  key={pic.user_id}
                                  className="rounded-full bg-background px-2 py-1 text-[11px] font-semibold text-primary/70"
                                >
                                  {pic.name}
                                  {pic.status !== "active" ? (
                                    <span className="ml-1 font-medium text-primary/40">
                                      (non-aktif)
                                    </span>
                                  ) : null}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className={`${bodyCell} min-w-[210px]`}>
                            <a
                              href={record.evidence.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={record.evidence.url}
                              className="block max-w-[220px] truncate text-xs font-semibold text-secondary underline decoration-secondary/30 underline-offset-2 hover:decoration-secondary"
                            >
                              {record.evidence.name}
                            </a>
                          </td>

                          <td className={`${bodyCell} min-w-[220px] text-[11px]`}>
                            <div className="space-y-1.5">
                              <div>
                                <span className="font-semibold text-primary/50">Dibuat</span>
                                <span className="ml-1 font-semibold text-primary/80">
                                  {record.created_by.name}
                                </span>
                                <span className="block text-primary/50">
                                  {formatKnowledgeDate(record.created_at)}
                                </span>
                              </div>
                              <div>
                                <span className="font-semibold text-primary/50">Diubah</span>
                                <span className="ml-1 font-semibold text-primary/80">
                                  {record.updated_by?.name ?? EMPTY_VALUE}
                                </span>
                                <span className="block text-primary/50">
                                  {formatKnowledgeDate(record.updated_at)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {canManage ? (
                            <td className={`${bodyCell} whitespace-nowrap text-right`}>
                              <button
                                type="button"
                                onClick={() => setFormState({ mode: "edit", record })}
                                className="rounded-md bg-background px-3 py-1.5 text-[11px] font-bold text-primary/70 transition-colors hover:bg-outline/50"
                              >
                                Edit
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                ));
              })()}
            </table>
          </div>
        )}
      </section>

      {formState ? (
        <KnowledgeFormDialog
          key={formState.mode === "edit" ? `edit-${formState.record.id}` : "create"}
          mode={formState.mode}
          knowledgeType={knowledgeType}
          record={formState.mode === "edit" ? formState.record : undefined}
          onClose={() => setFormState(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      ) : null}
    </div>
  );
}
