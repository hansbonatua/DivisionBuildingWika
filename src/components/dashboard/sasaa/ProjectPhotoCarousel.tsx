"use client";

import { useEffect, useState } from "react";
import type { SasaaPhoto } from "./types";

const AUTO_PLAY_MS = 6000;

export default function ProjectPhotoCarousel({
  photos,
  projectName,
}: {
  photos: SasaaPhoto[];
  projectName: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = (): void => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (photos.length <= 1 || paused || reducedMotion) {
      return;
    }
    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % photos.length);
    }, AUTO_PLAY_MS);
    return () => window.clearTimeout(timer);
  }, [index, paused, photos.length, reducedMotion]);

  if (photos.length === 0) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-outline bg-background p-8 text-center">
        <div>
          <p className="text-sm font-bold text-primary">Belum ada foto proyek.</p>
          <p className="mt-1 text-xs text-primary/55">
            Foto akan tampil setelah empat slot diisi.
          </p>
        </div>
      </div>
    );
  }

  const activeIndex = Math.min(index, photos.length - 1);
  const active = photos[activeIndex];
  const countLabel = `${String(activeIndex + 1).padStart(2, "0")} / ${String(photos.length).padStart(2, "0")}`;

  function goTo(nextIndex: number): void {
    setIndex((nextIndex + photos.length) % photos.length);
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={`Foto proyek ${projectName}`}
      className="group relative overflow-hidden rounded-2xl border border-outline bg-slate-900 shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (
          !event.relatedTarget ||
          !event.currentTarget.contains(event.relatedTarget as Node)
        ) {
          setPaused(false);
        }
      }}
    >
      <div className="relative aspect-[16/7] min-h-64 w-full sm:min-h-80">
        {photos.map((photo, photoIndex) => (
          <img
            key={`${photo.slot}-${photo.url}`}
            src={photo.url}
            alt={photo.alt}
            loading={photoIndex === 0 ? "eager" : "lazy"}
            aria-hidden={photoIndex !== activeIndex}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              photoIndex === activeIndex ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-slate-950/20" />

        <div className="absolute left-4 top-4 rounded-full bg-slate-950/55 px-3 py-1.5 text-[11px] font-bold tabular-nums text-white backdrop-blur-sm">
          <span className="sr-only">Foto </span>
          {countLabel}
        </div>

        {photos.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              aria-label="Foto sebelumnya"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-primary shadow-md transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-white"
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
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              aria-label="Foto berikutnya"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-primary shadow-md transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-white"
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
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
          <p className="line-clamp-1 text-xs font-semibold text-white/90">
            {active?.alt}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {photos.map((photo, photoIndex) => (
              <button
                key={`dot-${photo.slot}`}
                type="button"
                onClick={() => goTo(photoIndex)}
                aria-label={`Tampilkan foto ${photoIndex + 1}`}
                aria-current={photoIndex === activeIndex ? "true" : undefined}
                className={`h-2 rounded-full transition-all ${
                  photoIndex === activeIndex
                    ? "w-6 bg-white"
                    : "w-2 bg-white/55 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
