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

const certificates: Certificate[] = [
  { image: "/asset/hero/1-IKN.jpg", alt: "Lorem Ipsum Certificate 01", name: "Lorem Ipsum Certificate Name 01", score: 91 },
  { image: "/asset/hero/9.jpg", alt: "Lorem Ipsum Certificate 02", name: "Lorem Ipsum Certificate Name 02", score: 93 },
  { image: "/asset/hero/11.jpg", alt: "Lorem Ipsum Certificate 03", name: "Lorem Ipsum Certificate Name 03", score: 95 },
  { image: "/asset/hero/12.jpg", alt: "Lorem Ipsum Certificate 04", name: "Lorem Ipsum Certificate Name 04", score: 92 },
  { image: "/asset/hero/13.jpg", alt: "Lorem Ipsum Certificate 05", name: "Lorem Ipsum Certificate Name 05", score: 94 },
  { image: "/asset/hero/7.jpg", alt: "Lorem Ipsum Certificate 06", name: "Lorem Ipsum Certificate Name 06", score: 96 },
  { image: "/asset/hero/8.jpg", alt: "Lorem Ipsum Certificate 07", name: "Lorem Ipsum Certificate Name 07", score: 93 },
  { image: "/asset/hero/10.jpg", alt: "Lorem Ipsum Certificate 08", name: "Lorem Ipsum Certificate Name 08", score: 95 },
  { image: "/asset/hero/14.jpg", alt: "Lorem Ipsum Certificate 09", name: "Lorem Ipsum Certificate Name 09", score: 97 },
  { image: "/asset/hero/2.jpg", alt: "Lorem Ipsum Certificate 10", name: "Lorem Ipsum Certificate Name 10", score: 92 },
  { image: "/asset/hero/3.jpg", alt: "Lorem Ipsum Certificate 11", name: "Lorem Ipsum Certificate Name 11", score: 94 },
  { image: "/asset/hero/4.jpg", alt: "Lorem Ipsum Certificate 12", name: "Lorem Ipsum Certificate Name 12", score: 96 },
];

const TOTAL = certificates.length;

export default function GreenBuilding() {
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
    timerRef.current = setInterval(() => {
      setAnimate(true);
      setTrackPos((prev) => prev + 1);
    }, CERT_DELAY_MS);
  }, [stopAutoplay]);

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
  }, [perView]);

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
  }, [trackPos, perView]);

  const extended = useMemo(
    () => [
      ...certificates.slice(TOTAL - perView).map((c, i) => ({ cert: c, key: `pre-${i}`, clone: true })),
      ...certificates.map((c, i) => ({ cert: c, key: `main-${i}`, clone: false })),
      ...certificates.slice(0, perView).map((c, i) => ({ cert: c, key: `post-${i}`, clone: true })),
    ],
    [perView],
  );

  const real = ((trackPos - perView) % TOTAL + TOTAL) % TOTAL;
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
                      <Image
                        src={item.cert.image}
                        alt={item.clone ? "" : item.cert.alt}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        loading="lazy"
                        className="object-cover"
                      />
                      <span className="absolute left-3 top-3 rounded-md border border-outline/30 bg-surface/90 px-2.5 py-1 text-[11px] font-bold text-secondary backdrop-blur-sm">
                        Lorem
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-secondary">
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
                          Lorem Ipsum
                        </span>
                        <span className="text-xs text-primary/50">Year: 2026</span>
                      </div>
                      <h4 className="text-lg font-bold text-primary">{item.cert.name}</h4>
                      <p className="text-xs font-semibold text-secondary">Lorem Ipsum Certification</p>
                      <p className="text-sm leading-relaxed text-primary/70">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
                        labore et dolore magna aliqua.
                      </p>
                      <div className="mt-auto flex items-center justify-between border-t border-outline/20 pt-3 text-xs">
                        <span className="text-primary/50">Score: {item.cert.score}/100</span>
                        <span className="font-semibold text-secondary">Verified</span>
                      </div>
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
                key={cert.name}
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
      </div>
    </section>
  );
}
