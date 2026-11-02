"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { Project } from "@/components/landing/Projects";

// Read-only detail view for one Our Projects card.
//
// Dependency-free on purpose (same approach as the organization-structure
// viewer): a fixed overlay, native scrolling and a close button. Nothing here
// writes data — every field comes from the CMS record already shown on the
// card, so the modal can never invent copy.
//
// Focus and scrolling are handled in this component so the trigger needs no
// bookkeeping: the mount effect remembers the element that had focus, moves
// focus to the close button, locks body scrolling, and the cleanup restores
// both. Escape is a separate effect so it never re-focuses on re-render.

type ProjectDetailModalProps = {
  project: Project;
  onClose: () => void;
};

const TITLE_ID = "project-detail-modal-title";

export default function ProjectDetailModal({ project, onClose }: ProjectDetailModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      // Return focus to the "Lihat Detail" button that opened this modal.
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const isLocalImage = project.image.startsWith("/");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:max-h-[88dvh] sm:max-w-3xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Tutup detail proyek"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface/95 text-primary shadow-md transition-colors hover:bg-secondary hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="relative aspect-video w-full overflow-hidden bg-background">
            {isLocalImage ? (
              <Image
                src={project.image}
                alt={project.alt || project.title}
                fill
                sizes="(max-width: 640px) 100vw, 768px"
                className="object-cover"
              />
            ) : (
              // Remote CMS URLs bypass next/image so no remotePatterns config is
              // needed — identical strategy to the project card.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.image}
                alt={project.alt || project.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </div>

          <div className="space-y-3 p-5 sm:p-6">
            <div className="inline-flex rounded-md border border-outline/30 bg-background px-2.5 py-1 text-[11px] font-bold text-secondary">
              {project.category}
            </div>

            <h3 id={TITLE_ID} className="text-xl font-bold leading-snug text-primary sm:text-2xl">
              {project.title}
            </h3>

            {project.meta ? (
              <p className="flex items-center gap-1.5 text-xs text-primary/60">
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
                  className="text-secondary"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {project.meta}
              </p>
            ) : null}

            {project.progress !== null ? (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-primary/70">
                  <span>Progres Pengerjaan</span>
                  <span className="tabular-nums">{project.progress}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={project.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progres ${project.title}`}
                  className="h-2 w-full rounded bg-slate-200"
                >
                  <div className="h-2 rounded bg-secondary" style={{ width: `${project.progress}%` }} />
                </div>
              </div>
            ) : null}

            {project.description ? (
              // Full CMS text: line breaks preserved, wraps, and the scroll
              // container above keeps long descriptions readable on mobile.
              <p className="whitespace-pre-line break-words pt-1 text-sm leading-relaxed text-primary/80">
                {project.description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
