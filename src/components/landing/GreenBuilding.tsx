"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

type Certificate = {
  image: string;
  alt: string;
  name: string;
  score: number;
};

const CERT_DELAY_MS = 3500;
const SNAP_MS = 520;
const DRAG_THRESHOLD_PX = 50;

type LoadState = "loading" | "ready" | "error";

type GreenBuildingPublicPayload = {
  projectName?: unknown;
  imageUrl?: unknown;
  imageAlt?: unknown;
  score?: unknown;
};

function toLandingCertificate(item: GreenBuildingPublicPayload): Certificate | null {
  if (typeof item.projectName !== "string" || item.projectName.length === 0) {
    return null;
  }
  if (typeof item.imageUrl !== "string" || item.imageUrl.length === 0) {
    return null;
  }
  return {
    image: item.imageUrl,
    alt:
      typeof item.imageAlt === "string" && item.imageAlt.length > 0
        ? item.imageAlt
        : item.projectName,
    name: item.projectName,
    score: typeof item.score === "number" && Number.isFinite(item.score) ? item.score : 0,
  };
}

export default function GreenBuilding() {
  // Empty-first render keeps SSR/hydration deterministic; the CMS feed fills in.
  // No certificate, project name or score is ever invented.
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");
  const TOTAL = certificates.length;
  const [perView, setPerView] = useState(3);
  const [trackPos, setTrackPos] = useState(3);
  const [animate, setAnimate] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragDx, setDragDx] = useState(0);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const snapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef({ down: false, startX: 0 });

  const stopAutoplay = useCallback((): void => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startAutoplay = useCallback((): void => {
    stopAutoplay();
    // Nothing to rotate with zero or one certificate.
    if (certificates.length <= 1) {
      return;
    }
    timerRef.current = setInterval(() => {
      setAnimate(true);
      setTrackPos((prev) => prev + 1);
    }, CERT_DELAY_MS);
  }, [stopAutoplay, certificates.length]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport === null) {
      return;
    }
    const resolvePerView = (): number => (viewport.clientWidth >= 640 ? 3 : 1);
    setPerView(resolvePerView());
    const observer = new ResizeObserver(() => {
      setPerView(resolvePerView());
    });
    observer.observe(viewport);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    setAnimate(false);
    setTrackPos(perView);
  }, [perView, certificates.length]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/green-buildings/public")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<{ data?: unknown }>;
      })
      .then((body) => {
        if (cancelled) {
          return;
        }
        const mapped = Array.isArray(body.data)
          ? body.data
              .map((item) => toLandingCertificate(item as GreenBuildingPublicPayload))
              .filter((cert): cert is Certificate => cert !== null)
          : [];
        setCertificates(mapped);
        setStatus("ready");
      })
      .catch(() => {
        // No invented certificates and no raw error text: a neutral empty state.
        if (!cancelled) {
          setCertificates([]);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    startAutoplay();
    return () => {
      stopAutoplay();
      if (snapTimeoutRef.current !== null) {
        clearTimeout(snapTimeoutRef.current);
      }
    };
  }, [startAutoplay]);

  useEffect(() => {
    if (snapTimeoutRef.current !== null) {
      clearTimeout(snapTimeoutRef.current);
    }
    snapTimeoutRef.current = setTimeout(() => {
      if (trackPos >= TOTAL + perView) {
        setAnimate(false);
        setTrackPos(perView);
      } else if (trackPos < perView) {
        setAnimate(false);
        setTrackPos(TOTAL + trackPos);
      }
    }, SNAP_MS);
    return () => {
      if (snapTimeoutRef.current !== null) {
        clearTimeout(snapTimeoutRef.current);
      }
    };
  }, [trackPos, perView, TOTAL]);

  const extended = useMemo(
    () => [
      ...certificates.slice(TOTAL - perView).map((c, i) => ({ cert: c, key: `pre-${i}`, clone: true })),
      ...certificates.map((c, i) => ({ cert: c, key: `main-${i}`, clone: false })),
      ...certificates.slice(0, perView).map((c, i) => ({ cert: c, key: `post-${i}`, clone: true })),
    ],
    [perView, certificates, TOTAL],
  );

  // Guard the modulo: an empty feed has no index to normalise.
  const real = TOTAL === 0 ? 0 : ((trackPos - perView) % TOTAL + TOTAL) % TOTAL;
  const centerOffset = 50 - 50 / perView;
  const baseShift = -(trackPos * (100 / perView)) + centerOffset;
  const viewportWidth = viewportRef.current?.clientWidth ?? 0;
  const dragShift = dragging && viewportWidth > 0 ? (dragDx / viewportWidth) * 100 : 0;

  function goNext(): void {
    setAnimate(true);
    setTrackPos((prev) => prev + 1);
    startAutoplay();
  }

  function goPrev(): void {
    setAnimate(true);
    setTrackPos((prev) => prev - 1);
    startAutoplay();
  }

  function goCert(index: number): void {
    setAnimate(true);
    setTrackPos(perView + index);
    startAutoplay();
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>): void {
    dragRef.current = { down: true, startX: e.clientX };
    setDragging(true);
    setAnimate(false);
    setDragDx(0);
    stopAutoplay();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer capture unsupported, drag still works */
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>): void {
    if (!dragRef.current.down) {
      return;
    }
    setDragDx(e.clientX - dragRef.current.startX);
  }

  function handlePointerEnd(): void {
    if (!dragRef.current.down) {
      return;
    }
    const dx = dragDx;
    dragRef.current = { down: false, startX: 0 };
    setDragging(false);
    setDragDx(0);
    setAnimate(true);
    if (dx <= -DRAG_THRESHOLD_PX) {
      setTrackPos((prev) => prev + 1);
    } else if (dx >= DRAG_THRESHOLD_PX) {
      setTrackPos((prev) => prev - 1);
    }
    startAutoplay();
  }

  return (
    <section className="relative w-full max-w-full overflow-hidden border-y border-[#D4E2ED] bg-gradient-to-b from-[#F3FAFF] via-[#E4F2FC] to-[#D5EBFB] py-20 lg:py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{ backgroundImage: "radial-gradient(#006BB6 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="mb-2 inline-flex items-center justify-center gap-2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-secondary"
            >
              <circle cx="12" cy="8" r="6" />
              <path d="M15.5 13 17 22l-5-3-5 3 1.5-9" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-widest text-secondary">
              HONORS &amp; RECOGNITION
            </span>
          </div>
          <h2 className="text-3xl font-bold text-primary md:text-4xl">Green Building Certificate</h2>
          <p className="mt-2 text-base text-primary/70">
            Recognition of our commitment to quality, engineering innovation, and sustainable capital development.
          </p>
        </div>

        {status === "loading" ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3" aria-busy="true">
            {[0, 1, 2].map((slot) => (
              <div key={slot} className="h-80 animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        ) : certificates.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-outline/60 bg-surface/60 px-6 py-12 text-center">
            <p className="text-sm font-semibold text-primary">
              {status === "error"
                ? "Data sertifikat sedang tidak dapat dimuat."
                : "Belum ada sertifikat yang ditampilkan."}
            </p>
            <p className="text-xs text-primary/60">Silakan kembali lagi nanti.</p>
          </div>
        ) : (
        <>
        <div
          ref={viewportRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onMouseEnter={stopAutoplay}
          onMouseLeave={() => {
            if (!dragRef.current.down) {
              startAutoplay();
            }
          }}
          className={`overflow-hidden ${dragging ? "cursor-grabbing" : "cursor-grab"} [touch-action:pan-y]`}
        >
          <div
            className={`flex will-change-transform ${animate && !dragging ? "transition-transform duration-500 ease-out" : ""}`}
            style={{ transform: `translateX(${baseShift + dragShift}%)` }}
          >
            {extended.map((item, pos) => {
              const off = pos - trackPos;
              const abs = Math.abs(off);
              const scale = off === 0 ? 1 : abs === 1 ? 0.84 : 0.7;
              const opacity = off === 0 ? 1 : abs === 1 ? 0.55 : 0.25;
              return (
                <div
                  key={item.key}
                  aria-hidden={item.clone || undefined}
                  data-clone={item.clone}
                  className="w-full shrink-0 basis-full px-[10px] sm:basis-1/3"
                  style={{
                    transform: `scale(${scale})`,
                    opacity,
                    zIndex: String(100 - abs),
                    transition: "transform .55s ease, opacity .55s ease",
                  }}
                >
                  <div
                    className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-surface shadow-sm transition-shadow hover:shadow-lg ${
                      off === 0 ? "border-secondary/35 shadow-[0_24px_48px_-12px_rgba(0,31,63,0.35)]" : "border-outline/40"
                    }`}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      {item.cert.image.startsWith("/") ? (
                        <Image
                          src={item.cert.image}
                          alt={item.clone ? "" : item.cert.alt}
                          fill
                          sizes="(max-width: 640px) 100vw, 33vw"
                          loading="lazy"
                          className="object-cover"
                        />
                      ) : (
                        // Remote CMS URLs bypass next/image so no remotePatterns config is needed.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.cert.image}
                          alt={item.clone ? "" : item.cert.alt}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      )}
                      <span className="absolute left-3 top-3 rounded-md border border-outline/30 bg-surface/90 px-2.5 py-1 text-[11px] font-bold text-secondary backdrop-blur-sm">
                        Green Building
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      <div className="flex items-center gap-1 text-xs font-bold text-secondary">
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
                          <circle cx="12" cy="8" r="6" />
                          <path d="M15.5 13 17 22l-5-3-5 3 1.5-9" />
                        </svg>
                        <span>Sertifikat</span>
                      </div>
                      <h4 className="text-lg font-bold text-primary">{item.cert.name}</h4>
                      {item.cert.score > 0 ? (
                        <div className="mt-auto border-t border-outline/20 pt-3 text-xs text-primary/50">
                          Score: {item.cert.score}/100
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <span className="font-mono text-xs tracking-wider text-primary/50">
            {String(real + 1).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {certificates.map((cert, index) => (
              <button
                key={`${cert.image}-${cert.name}-${index}`}
                type="button"
                aria-label={`Ke sertifikat ${String(index + 1).padStart(2, "0")}`}
                aria-current={index === real}
                onClick={() => goCert(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === real ? "w-6 bg-secondary" : "w-2 bg-outline hover:bg-secondary/50"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Sertifikat sebelumnya"
              onClick={goPrev}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline/50 bg-surface text-primary transition-colors hover:bg-secondary hover:text-white focus:outline-none"
            >
              <svg
                width="20"
                height="20"
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
              aria-label="Sertifikat berikutnya"
              onClick={goNext}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline/50 bg-surface text-primary transition-colors hover:bg-secondary hover:text-white focus:outline-none"
            >
              <svg
                width="20"
                height="20"
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
          </div>
        </div>
        </>
        )}
      </div>
    </section>
  );
}
