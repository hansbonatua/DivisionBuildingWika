"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  KNOWLEDGE_TYPE_LABELS,
  type KnowledgeType,
} from "@/lib/knowledge-management/schema";
import {
  EMPTY_VALUE,
  formatKnowledgeDate,
  type KnowledgeRecordDto,
} from "@/components/dashboard/knowledge-management/types";

// Read-only snapshot of one KM record. It never fetches: every field comes from
// the KnowledgeRecordDto already loaded by the table, so opening it cannot
// disagree with the row the user clicked and adds no server round-trip.
//
// Optional onDownloadPdf is wired in Sub-Fase D (F-02a). Until then the caller
// omits it and the button is not rendered.

const sectionTitle =
  "text-[11px] font-bold uppercase tracking-wide text-primary/45";
const cardClass =
  "rounded-xl border border-outline/60 bg-background/40 px-4 py-3";

export default function KnowledgeViewDialog({
  record,
  knowledgeType,
  onClose,
  onDownloadPdf,
}: {
  record: KnowledgeRecordDto;
  knowledgeType: KnowledgeType;
  onClose: () => void;
  onDownloadPdf?: (record: KnowledgeRecordDto) => Promise<void>;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const label = KNOWLEDGE_TYPE_LABELS[knowledgeType];

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !pdfBusy) {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pdfBusy, onClose]);

  function handleTab(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function handleDownloadPdf(): Promise<void> {
    if (!onDownloadPdf || pdfBusy) return;
    setPdfBusy(true);
    setPdfError(null);
    try {
      await onDownloadPdf(record);
    } catch {
      setPdfError("Gagal menyiapkan PDF. Silakan coba lagi.");
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pdfBusy) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleTab}
        className="flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline bg-background/60 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">
              {label}
            </p>
            <h2 id={titleId} className="mt-0.5 text-lg font-bold text-primary">
              Lihat {label}
            </h2>
            <p className="mt-0.5 text-xs text-primary/55">
              {record.project.name} · {record.project.location} ({record.project.year})
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={pdfBusy}
            aria-label="Tutup detail"
            className="rounded-lg p-2 text-primary/50 transition-colors hover:bg-white hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <section>
            <h3 className={sectionTitle}>Master Project</h3>
            <div className={`mt-1.5 ${cardClass}`}>
              <p className="text-sm font-bold text-primary">{record.project.name}</p>
              <p className="mt-0.5 text-xs text-primary/60">
                {record.project.location} · {record.project.year}
              </p>
            </div>
          </section>

          <section>
            <h3 className={sectionTitle}>Kategori</h3>
            <div className="mt-1.5">
              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold text-secondary">
                {label}
              </span>
            </div>
          </section>

          <section>
            <h3 className={sectionTitle}>Isi Knowledge</h3>
            <p className="mt-1.5 whitespace-pre-wrap break-words rounded-xl border border-outline/60 bg-white px-4 py-3 text-xs font-medium leading-relaxed text-primary/85">
              {record.content}
            </p>
          </section>

          <section>
            <h3 className={sectionTitle}>PIC</h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {record.pics.map((pic) => (
                <span
                  key={pic.user_id}
                  className="rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold text-primary/75"
                >
                  {pic.name}
                  {pic.status !== "active" ? (
                    <span className="ml-1 font-medium text-primary/40">(non-aktif)</span>
                  ) : null}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h3 className={sectionTitle}>Evidence</h3>
            <div className={`mt-1.5 ${cardClass}`}>
              <a
                href={record.evidence.url}
                target="_blank"
                rel="noopener noreferrer"
                title={record.evidence.url}
                className="break-words text-xs font-bold text-secondary underline decoration-secondary/30 underline-offset-2 hover:decoration-secondary"
              >
                {record.evidence.name}
              </a>
              <p className="mt-1 break-all text-[11px] text-primary/50">
                {record.evidence.url}
              </p>
            </div>
          </section>

          <section>
            <h3 className={sectionTitle}>Record History</h3>
            <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
              <div className={cardClass}>
                <p className="text-[11px] font-bold uppercase tracking-wide text-primary/40">
                  Created By
                </p>
                <p className="mt-1 text-xs font-semibold text-primary">
                  {record.created_by.name}
                </p>
                <p className="text-[11px] text-primary/50">
                  {formatKnowledgeDate(record.created_at)}
                </p>
              </div>
              <div className={cardClass}>
                <p className="text-[11px] font-bold uppercase tracking-wide text-primary/40">
                  Updated By
                </p>
                <p className="mt-1 text-xs font-semibold text-primary">
                  {record.updated_by?.name ?? EMPTY_VALUE}
                </p>
                <p className="text-[11px] text-primary/50">
                  {formatKnowledgeDate(record.updated_at)}
                </p>
              </div>
            </div>
          </section>

          {pdfError ? (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
            >
              {pdfError}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-outline bg-background/40 px-5 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={pdfBusy}
            className="rounded-lg border border-outline bg-white px-4 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            Tutup
          </button>
          {onDownloadPdf ? (
            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              disabled={pdfBusy}
              className="rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pdfBusy ? "Menyiapkan PDF..." : "Download PDF"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
