"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import {
  loadPdfjs,
  PDFJS_STANDARD_FONT_DATA_URL,
  readApiErrorMessage,
} from "@/components/dashboard/berkas/client";
import type { BerkasDto } from "@/components/dashboard/berkas/types";

function PdfPage({
  document,
  pageNumber,
}: {
  document: PDFDocumentProxy;
  pageNumber: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;

    async function renderPage(): Promise<void> {
      try {
        const page = await document.getPage(pageNumber);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const cssWidth = Math.min(960, baseViewport.width);
        const viewport = page.getViewport({ scale: cssWidth / baseViewport.width });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;

        const task = page.render({
          canvas,
          viewport,
          transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
        });
        renderTask = task;
        await task.promise;
        page.cleanup();
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void renderPage();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [document, pageNumber]);

  if (failed) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-10 text-center text-xs font-semibold text-red-700">
        Halaman {pageNumber} gagal ditampilkan.
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-label={`Halaman ${pageNumber}`}
      className="mx-auto block h-auto w-full max-w-[960px] rounded-lg border border-slate-200 bg-white shadow-sm"
    />
  );
}

export default function PdfViewerModal({
  berkas,
  type = "original",
  onClose,
}: {
  berkas: Pick<BerkasDto, "id" | "judul">;
  type?: "original" | "generated";
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const previousFocus =
      window.document.activeElement instanceof HTMLElement
        ? window.document.activeElement
        : null;
    const previousOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.document.addEventListener("keydown", handleKeyDown);
    return () => window.document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadDocument(): Promise<void> {
      setLoading(true);
      setError(null);
      setCurrentPage(1);
      try {
        const viewUrl =
          type === "generated"
            ? `/api/berkas/${berkas.id}/view?type=generated`
            : `/api/berkas/${berkas.id}/view`;
        const response = await fetch(viewUrl, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            await readApiErrorMessage(
              response,
              "Gagal memuat PDF. Periksa koneksi lalu coba lagi.",
            ),
          );
        }
        const bytes = await response.arrayBuffer();
        const pdfjs = await loadPdfjs();
        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(bytes),
          standardFontDataUrl: PDFJS_STANDARD_FONT_DATA_URL,
        });
        loadingTaskRef.current = loadingTask;
        const loaded = await loadingTask.promise;
        if (!active) {
          await loadingTask.destroy();
          return;
        }
        setDocument(loaded);
      } catch (loadError) {
        if (!active || controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Gagal memuat PDF. Periksa koneksi lalu coba lagi.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDocument();
    return () => {
      active = false;
      controller.abort();
      void loadingTaskRef.current?.destroy();
      loadingTaskRef.current = null;
    };
  }, [berkas.id, type]);

  function goToPage(nextPage: number): void {
    if (!document) return;
    const next = Math.min(Math.max(1, nextPage), document.numPages);
    setCurrentPage(next);
    viewerRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }

  const activePage = document ? Math.min(currentPage, document.numPages) : 1;

  function handleTab(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && window.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && window.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleTab}
        className="flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:h-[92dvh] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline bg-background/70 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">
              {type === "generated"
                ? "Pratinjau PDF Final · View Only"
                : "Pratinjau PDF · View Only"}
            </p>
            <h2 id={titleId} className="mt-1 truncate text-lg font-bold text-primary">
              {berkas.judul}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup pratinjau"
            className="rounded-lg p-2 text-primary/50 transition-colors hover:bg-white hover:text-primary"
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

        <div
          ref={viewerRef}
          className="min-h-0 flex-1 overflow-y-auto bg-slate-100 px-3 py-4 sm:px-6"
        >
          {loading ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-xs font-semibold text-primary/60">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-secondary/30 border-t-secondary" />
              Memuat dokumen...
            </div>
          ) : error ? (
            <div className="mx-auto mt-12 max-w-md rounded-xl border border-red-200 bg-white p-5 text-center">
              <p className="text-sm font-bold text-red-700">PDF tidak dapat ditampilkan</p>
              <p className="mt-1 text-xs leading-relaxed text-primary/60">{error}</p>
            </div>
          ) : document ? (
            <div className="space-y-4">
              <div className="mx-auto flex max-w-[960px] items-center justify-between gap-3 rounded-xl border border-outline bg-white px-3 py-2 shadow-sm">
                <button
                  type="button"
                  onClick={() => goToPage(activePage - 1)}
                  disabled={activePage <= 1}
                  aria-label="Halaman sebelumnya"
                  className="rounded-lg border border-outline bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <span
                  aria-live="polite"
                  className="text-xs font-semibold text-primary/70"
                >
                  Halaman {activePage} dari {document.numPages}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(activePage + 1)}
                  disabled={activePage >= document.numPages}
                  aria-label="Halaman berikutnya"
                  className="rounded-lg border border-outline bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </div>
              <PdfPage
                key={activePage}
                document={document}
                pageNumber={activePage}
              />
            </div>
          ) : null}
        </div>

        <div className="border-t border-outline bg-white px-5 py-3 text-center text-[11px] font-medium text-primary/50">
          {type === "generated"
            ? "Pratinjau hasil akhir sudah diberi watermark NIP dan hanya dapat dilihat."
            : "Dokumen ini hanya dapat dilihat. Tombol unduh tersedia pada kolom File Generate setelah proses selesai."}
        </div>
      </div>
    </div>
  );
}
