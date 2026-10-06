"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type HeroSlide = {
  src: string;
  alt: string;
  project: string;
  location: string;
};

const HERO_INTERVAL_MS = 5000;

type HeroPublicPayload = {
  imageUrl?: unknown;
  imageAlt?: unknown;
  projectName?: unknown;
  location?: unknown;
  title?: unknown;
};

const FALLBACK_HERO_SLIDES: HeroSlide[] = [
  {
    src: "/asset/hero/2.jpg",
    alt: "Istana Negara IKN Nusantara — featured national project",
    project: "Istana Negara IKN Nusantara",
    location: "Penajam Paser Utara, Nusantara",
  },
  {
    src: "/asset/hero/3.jpg",
    alt: "Commercial superstructure by WIKA Building Division",
    project: "Commercial Superstructure",
    location: "Jakarta, Indonesia",
  },
  {
    src: "/asset/hero/4.jpg",
    alt: "Transit and connectivity hub construction",
    project: "Transit & Connectivity Hub",
    location: "Balikpapan Bay Corridor",
  },
  {
    src: "/asset/hero/5.jpg",
    alt: "Green terminal expansion project",
    project: "Green Terminal Expansion",
    location: "Java Hub, Indonesia",
  },
  {
    src: "/asset/hero/6.jpg",
    alt: "Renewable utility works site",
    project: "Renewable Utility Works",
    location: "North Kalimantan",
  },
];

function formatCounter(index: number, total: number): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${pad(index + 1)} / ${pad(total)}`;
}

function toLandingSlide(item: HeroPublicPayload): HeroSlide | null {
  if (typeof item.imageUrl !== "string" || item.imageUrl.length === 0) {
    return null;
  }
  if (typeof item.projectName !== "string" || item.projectName.length === 0) {
    return null;
  }
  const location = typeof item.location === "string" ? item.location : "";
  const title = typeof item.title === "string" ? item.title : "";
  const imageAlt = typeof item.imageAlt === "string" ? item.imageAlt : "";
  return {
    src: item.imageUrl,
    alt: imageAlt || item.projectName || title || "Hero WIBEX",
    project: item.projectName,
    location,
  };
}

export default function Hero() {
  // Fallback-first render keeps SSR/hydration deterministic; API swaps in when valid.
  const [slides, setSlides] = useState<HeroSlide[]>(FALLBACK_HERO_SLIDES);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAutoplay = useCallback((): void => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startAutoplay = useCallback((): void => {
    stopAutoplay();
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, HERO_INTERVAL_MS);
  }, [stopAutoplay, slides.length]);

  useEffect(() => {
    startAutoplay();
    return () => {
      stopAutoplay();
    };
  }, [startAutoplay]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/heroes/public")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<{ data?: unknown }>;
      })
      .then((body) => {
        if (cancelled || !Array.isArray(body.data)) {
          return;
        }
        const mapped = body.data
          .map((item) => toLandingSlide(item as HeroPublicPayload))
          .filter((slide): slide is HeroSlide => slide !== null);
        if (mapped.length > 0) {
          setSlides(mapped);
          setCurrent(0);
        }
      })
      .catch(() => {
        // Silent fallback: static slides remain. No user-facing error on landing.
        console.warn("Landing hero uses static fallback (public API unavailable).");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function goNext(): void {
    setCurrent((prev) => (prev + 1) % slides.length);
    startAutoplay();
  }

  function goPrev(): void {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
    startAutoplay();
  }

  const activeSlide = slides[current] ?? slides[0];

  return (
    <>
      <section
        id="home"
        className="relative flex aspect-video min-h-[40svh] w-full max-w-full flex-col justify-between overflow-hidden bg-primary max-[360px]:min-w-[100vw] md:aspect-auto md:min-h-svh"
      >
        <div className="absolute inset-0 z-0 max-w-full">
          {slides.map((slide, index) => (
            <div
              key={`${slide.src}-${index}`}
              aria-hidden={index !== current}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === current ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              {slide.src.startsWith("/") ? (
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  sizes="100vw"
                  priority={index === 0}
                  className="object-cover object-[center_30%]"
                />
              ) : (
                // Remote CMS URLs bypass next/image so no remotePatterns config is needed.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slide.src}
                  alt={slide.alt}
                  loading={index === 0 ? "eager" : "lazy"}
                  className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
                />
              )}
            </div>
          ))}
          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-primary/30 via-primary/10 to-transparent" />
        </div>
        <div className="relative z-10 flex-1" />
      </section>

      <div className="relative z-10 w-full max-w-full border-y border-outline/30 bg-primary py-4">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row lg:px-8">
          <div className="flex flex-wrap items-center gap-6 text-white md:gap-10">
            <div className="flex items-center gap-3">
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
                className="shrink-0 text-white/80"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                  Featured Project
                </div>
                <div className="text-sm font-semibold text-white">{activeSlide.project}</div>
              </div>
            </div>
            <div className="hidden h-8 w-px bg-white/20 sm:block" />
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/60">Location</div>
              <div className="text-xs font-medium text-white">{activeSlide.location}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-white">
            <Link
              href="#projects"
              className="mr-2 inline-flex items-center gap-2 rounded-lg bg-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-primary"
            >
              <span>Explore Our Project</span>
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
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
            <span className="font-mono text-xs tracking-wider text-white/80">
              {formatCounter(current, slides.length)}
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                aria-label="Previous Project"
                onClick={goPrev}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none"
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
              <div className="flex items-center space-x-1 px-1" aria-hidden="true">
                {slides.map((slide, index) => (
                  <span
                    key={`${slide.src}-${index}`}
                    className={
                      index === current
                        ? "h-1.5 w-6 rounded-full bg-white transition-all"
                        : "h-1.5 w-2 rounded-full bg-white/40 transition-all"
                    }
                  />
                ))}
              </div>
              <button
                type="button"
                aria-label="Next Project"
                onClick={goNext}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none"
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
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
