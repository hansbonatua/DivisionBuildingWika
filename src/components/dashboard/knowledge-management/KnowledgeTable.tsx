"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { canManageKnowledgeManagement } from "@/lib/knowledge-management/access";
import {
  KNOWLEDGE_TYPE_LABELS,
  type KnowledgeType,
} from "@/lib/knowledge-management/schema";

// Knowledge table with INLINE editing, modelled on the existing MSL Engineering
// table: one row is edited at a time, with Simpan/Batal in the action column.
//
// Two independent write surfaces:
//   1. Inline record  -> PUT content + PIC (optimistic concurrency token).
//   2. Evidence       -> POST/PATCH/DELETE ONE evidence row at a time.
// Evidence never travels with the record payload, so saving content/PIC can
// never drop evidence and adding evidence can never overwrite content/PIC.

type EvidenceDto = { id: string; name: string; url: string };
type PicDto = { id: string; name: string };

type KnowledgeRow = {
  projectId: string;
  projectName: string;
  projectLocation: string;
  projectYear: number;
  entryId: string | null;
  content: string | null;
  // Server timestamp used as the optimistic-concurrency token (KM-03).
  updatedAt: string | null;
  evidence: EvidenceDto[];
  pics: PicDto[];
};

type PicOption = { id: string; name: string; status: string; position: string };

type RecordDraft = {
  projectId: string;
  content: string;
  picIds: string[];
  expectedUpdatedAt: string | null;
};

type EvidenceDraft = {
  projectId: string;
  entryId: string;
  id: string | null;
  name: string;
  url: string;
};

const EMPTY_VALUE = "\u2014";

const headerCell =
  "whitespace-nowrap border-b border-outline bg-background px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";
const bodyCell = "border-b border-outline/50 px-4 py-3 align-top text-xs text-primary/80";

const inputClass =
  "w-full rounded-lg border border-outline/60 bg-white px-2.5 py-1.5 text-xs font-medium text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20";

const linkClass =
  "block truncate text-xs font-semibold text-secondary underline decoration-secondary/30 underline-offset-2 hover:decoration-secondary";

const smallButton =
  "rounded-md px-2 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    if (typeof body.error?.message === "string" && body.error.message.trim() !== "") {
      return body.error.message;
    }
  } catch {
    /* non-JSON error body */
  }
  if (response.status === 401) return "Sesi Anda berakhir. Silakan masuk kembali.";
  if (response.status === 403) return "Anda tidak memiliki akses untuk mengubah data ini.";
  return fallback;
}

export default function KnowledgeTable({
  knowledgeType,
  currentUserRole,
}: {
  knowledgeType: KnowledgeType;
  currentUserRole: string;
}) {
  const [rows, setRows] = useState<KnowledgeRow[]>([]);
  const [picOptions, setPicOptions] = useState<PicOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [recordDraft, setRecordDraft] = useState<RecordDraft | null>(null);
  const [recordSaving, setRecordSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [evidenceDraft, setEvidenceDraft] = useState<EvidenceDraft | null>(null);
  const [evidenceSaving, setEvidenceSaving] = useState(false);
  const [deletingEvidenceId, setDeletingEvidenceId] = useState<string | null>(null);

  const canManage = canManageKnowledgeManagement(currentUserRole);
  const label = KNOWLEDGE_TYPE_LABELS[knowledgeType];

  // Pure fetch: never touches React state, so it is safe to call from anywhere.
  const fetchRows = useCallback(async (): Promise<KnowledgeRow[]> => {
    const response = await fetch(
      `/api/knowledge-management?type=${encodeURIComponent(knowledgeType)}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const body = (await response.json()) as { data?: KnowledgeRow[] };
    return Array.isArray(body.data) ? body.data : [];
  }, [knowledgeType]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await fetchRows();
        if (!active) return;
        setError(null);
        setRows(data);
      } catch {
        if (active) setError("Gagal memuat data Knowledge Management.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchRows]);

  async function reloadRows(): Promise<void> {
    try {
      const data = await fetchRows();
      setError(null);
      setRows(data);
    } catch {
      setError("Gagal memuat data Knowledge Management.");
    } finally {
      setLoading(false);
    }
  }

  function retryLoad(): void {
    setLoading(true);
    void reloadRows();
  }

  useEffect(() => {
    if (!canManage) {
      return;
    }
    let active = true;
    async function loadPicOptions(): Promise<void> {
      try {
        const response = await fetch("/api/knowledge-management/pic-options", {
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }
        const body = (await response.json()) as { data?: PicOption[] };
        if (active && Array.isArray(body.data)) {
          setPicOptions(body.data);
        }
      } catch {
        /* PIC editing simply stays unavailable; server rules remain authoritative */
      }
    }
    void loadPicOptions();
    return () => {
      active = false;
    };
  }, [canManage]);

  const picNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of picOptions) {
      map.set(option.id, option.status === "active" ? option.name : `${option.name} (non-aktif)`);
    }
    return map;
  }, [picOptions]);

  function startEdit(row: KnowledgeRow): void {
    setActionError(null);
    setConflict(false);
    setEvidenceDraft(null);
    setRecordDraft({
      projectId: row.projectId,
      content: row.content ?? "",
      picIds: row.pics.map((pic) => pic.id),
      expectedUpdatedAt: row.updatedAt,
    });
  }

  function cancelEdit(): void {
    setRecordDraft(null);
    setActionError(null);
    setConflict(false);
  }

  function togglePic(picId: string): void {
    setRecordDraft((current) => {
      if (!current) return current;
      const selected = current.picIds.includes(picId)
        ? current.picIds.filter((id) => id !== picId)
        : [...current.picIds, picId];
      return { ...current, picIds: selected };
    });
  }

  async function saveRecord(): Promise<void> {
    if (!recordDraft || recordSaving) return;
    const content = recordDraft.content.trim();
    if (content.length === 0) {
      setActionError("Isi knowledge wajib diisi.");
      return;
    }
    if (recordDraft.picIds.length === 0) {
      setActionError("Pilih minimal 1 PIC.");
      return;
    }

    setRecordSaving(true);
    setActionError(null);
    setConflict(false);
    try {
      const response = await fetch(
        `/api/knowledge-management/${recordDraft.projectId}/${knowledgeType}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            picIds: recordDraft.picIds,
            expectedUpdatedAt: recordDraft.expectedUpdatedAt,
          }),
        },
      );
      if (!response.ok) {
        if (response.status === 409) {
          setConflict(true);
        }
        setActionError(await readErrorMessage(response, "Gagal menyimpan knowledge."));
        return;
      }
      setRecordDraft(null);
      await reloadRows();
    } catch {
      setActionError("Gagal menyimpan knowledge.");
    } finally {
      setRecordSaving(false);
    }
  }

  function discardAndReload(): void {
    setRecordDraft(null);
    setConflict(false);
    setActionError(null);
    void reloadRows();
  }

  function startAddEvidence(row: KnowledgeRow): void {
    if (!row.entryId) return;
    setActionError(null);
    setRecordDraft(null);
    setEvidenceDraft({
      projectId: row.projectId,
      entryId: row.entryId,
      id: null,
      name: "",
      url: "",
    });
  }

  function startEditEvidence(row: KnowledgeRow, evidence: EvidenceDto): void {
    if (!row.entryId) return;
    setActionError(null);
    setRecordDraft(null);
    setEvidenceDraft({
      projectId: row.projectId,
      entryId: row.entryId,
      id: evidence.id,
      name: evidence.name,
      url: evidence.url,
    });
  }

  function cancelEvidence(): void {
    setEvidenceDraft(null);
    setActionError(null);
  }

  async function saveEvidence(): Promise<void> {
    if (!evidenceDraft || evidenceSaving) return;
    const name = evidenceDraft.name.trim();
    const url = evidenceDraft.url.trim();
    if (name.length === 0 || url.length === 0) {
      setActionError("Nama dan URL evidence wajib diisi.");
      return;
    }

    const isEdit = evidenceDraft.id !== null;
    const endpoint = isEdit
      ? `/api/knowledge-management/evidence/${evidenceDraft.id}`
      : `/api/knowledge-management/${evidenceDraft.projectId}/${knowledgeType}/evidence`;

    setEvidenceSaving(true);
    setActionError(null);
    try {
      const response = await fetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url }),
      });
      if (!response.ok) {
        setActionError(await readErrorMessage(response, "Gagal menyimpan evidence."));
        return;
      }
      setEvidenceDraft(null);
      await reloadRows();
    } catch {
      setActionError("Gagal menyimpan evidence.");
    } finally {
      setEvidenceSaving(false);
    }
  }

  async function deleteEvidence(evidence: EvidenceDto): Promise<void> {
    if (deletingEvidenceId !== null) return;
    const confirmed = window.confirm(`Hapus evidence "${evidence.name}"?`);
    if (!confirmed) return;

    setDeletingEvidenceId(evidence.id);
    setActionError(null);
    try {
      const response = await fetch(`/api/knowledge-management/evidence/${evidence.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setActionError(await readErrorMessage(response, "Gagal menghapus evidence."));
        return;
      }
      if (evidenceDraft?.id === evidence.id) {
        setEvidenceDraft(null);
      }
      await reloadRows();
    } catch {
      setActionError("Gagal menghapus evidence.");
    } finally {
      setDeletingEvidenceId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-outline/60 bg-white p-6 text-xs text-primary/60">
        Memuat data {label}...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-primary/60">
          Konten dan PIC disimpan bersama lewat inline editing. Evidence dikelola per baris dan
          tidak mengubah konten maupun PIC.
        </p>
        {!canManage && (
          <span className="rounded-full bg-background px-3 py-1 text-[11px] font-semibold text-primary/60">
            Mode baca
          </span>
        )}
      </div>

      {error && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          <span>{error}</span>
          <button type="button" onClick={retryLoad} className={`${smallButton} bg-red-100`}>
            Coba lagi
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
          <span>{actionError}</span>
          {conflict && (
            <button
              type="button"
              onClick={discardAndReload}
              className={`${smallButton} bg-amber-100`}
            >
              Muat ulang &amp; batalkan perubahan
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-outline/60 bg-white">
        <table className="w-full min-w-[1100px] border-collapse text-left">
          <thead>
            <tr>
              <th className={headerCell}>Project</th>
              <th className={headerCell}>Knowledge Content</th>
              <th className={headerCell}>PIC</th>
              <th className={headerCell}>Evidence</th>
              {canManage && <th className={headerCell}>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className={`${bodyCell} text-center text-primary/50`} colSpan={canManage ? 5 : 4}>
                  Belum ada Master Project.
                </td>
              </tr>
            )}

            {rows.map((row) => {
              const isEditing = recordDraft?.projectId === row.projectId;
              const evidenceForRow =
                evidenceDraft?.entryId === row.entryId ? evidenceDraft : null;

              return (
                <tr key={row.projectId} className={isEditing ? "bg-secondary/5" : undefined}>
                  <td className={bodyCell}>
                    <span className="block font-semibold text-primary">{row.projectName}</span>
                    <span className="mt-1 block text-[11px] text-primary/50">
                      {row.projectLocation} · {row.projectYear}
                    </span>
                  </td>

                  <td className={`${bodyCell} max-w-[380px]`}>
                    {isEditing ? (
                      <textarea
                        value={recordDraft.content}
                        onChange={(event) =>
                          setRecordDraft({ ...recordDraft, content: event.target.value })
                        }
                        rows={7}
                        aria-label={`Isi knowledge ${row.projectName}`}
                        className={`${inputClass} min-h-32 resize-y leading-relaxed`}
                        placeholder="Tulis ringkasan, poin, atau langkah..."
                      />
                    ) : (
                      <span className="block whitespace-pre-wrap leading-relaxed">
                        {row.content ?? EMPTY_VALUE}
                      </span>
                    )}
                  </td>

                  <td className={`${bodyCell} min-w-[200px]`}>
                    {isEditing ? (
                      <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-outline/40 p-2">
                        {picOptions.length === 0 && (
                          <span className="text-[11px] text-primary/50">Memuat opsi PIC...</span>
                        )}
                        {picOptions.map((option) => (
                          <label
                            key={option.id}
                            className="flex items-start gap-2 text-[11px] font-medium text-primary/80"
                          >
                            <input
                              type="checkbox"
                              checked={recordDraft.picIds.includes(option.id)}
                              onChange={() => togglePic(option.id)}
                              className="mt-0.5"
                            />
                            <span>
                              {option.name}
                              {option.status !== "active" && (
                                <span className="ml-1 text-primary/40">(non-aktif)</span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : row.pics.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.pics.map((pic) => (
                          <span
                            key={pic.id}
                            className="rounded-full bg-background px-2 py-1 text-[11px] font-semibold text-primary/70"
                          >
                            {picNameById.get(pic.id) ?? pic.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-primary/40">{EMPTY_VALUE}</span>
                    )}
                  </td>

                  <td className={`${bodyCell} min-w-[240px]`}>
                    <div className="space-y-2">
                      {row.evidence.length === 0 && !evidenceForRow && (
                        <span className="block text-[11px] text-primary/40">Belum ada evidence</span>
                      )}

                      {row.evidence.map((evidence) => (
                        <div key={evidence.id} className="space-y-1">
                          <a
                            href={evidence.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={linkClass}
                            title={evidence.url}
                          >
                            {evidence.name}
                          </a>
                          {canManage && !isEditing && evidenceDraft === null && (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => startEditEvidence(row, evidence)}
                                className={`${smallButton} bg-background text-primary/70`}
                              >
                                Ubah
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteEvidence(evidence)}
                                disabled={deletingEvidenceId !== null}
                                className={`${smallButton} bg-red-50 text-red-700`}
                              >
                                {deletingEvidenceId === evidence.id ? "Menghapus..." : "Hapus"}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {evidenceForRow && (
                        <div className="space-y-1.5 rounded-lg border border-secondary/30 bg-secondary/5 p-2">
                          <input
                            value={evidenceForRow.name}
                            onChange={(event) =>
                              setEvidenceDraft({ ...evidenceForRow, name: event.target.value })
                            }
                            placeholder="Nama evidence"
                            aria-label="Nama evidence"
                            className={inputClass}
                          />
                          <input
                            value={evidenceForRow.url}
                            onChange={(event) =>
                              setEvidenceDraft({ ...evidenceForRow, url: event.target.value })
                            }
                            placeholder="https://..."
                            aria-label="URL evidence"
                            className={inputClass}
                          />
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => void saveEvidence()}
                              disabled={evidenceSaving}
                              className={`${smallButton} bg-secondary text-white`}
                            >
                              {evidenceSaving ? "Menyimpan..." : "Simpan"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEvidence}
                              disabled={evidenceSaving}
                              className={`${smallButton} bg-white text-primary/70`}
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      )}

                      {canManage && !isEditing && evidenceDraft === null && (
                        <button
                          type="button"
                          onClick={() => startAddEvidence(row)}
                          disabled={!row.entryId}
                          title={
                            row.entryId
                              ? "Tambah evidence"
                              : "Simpan konten dan PIC terlebih dahulu"
                          }
                          className={`${smallButton} bg-background text-primary/70`}
                        >
                          + Tambah evidence
                        </button>
                      )}
                    </div>
                  </td>

                  {canManage && (
                    <td className={`${bodyCell} whitespace-nowrap`}>
                      {isEditing ? (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => void saveRecord()}
                            disabled={recordSaving}
                            className={`${smallButton} bg-secondary text-white`}
                          >
                            {recordSaving ? "Menyimpan..." : "Simpan"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={recordSaving}
                            className={`${smallButton} bg-background text-primary/70`}
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          disabled={evidenceDraft !== null}
                          className={`${smallButton} bg-background text-primary/70`}
                        >
                          {row.entryId ? "Edit" : "Tambah"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
