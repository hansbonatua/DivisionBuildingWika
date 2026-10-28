"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type Project = {
  title: string;
  category: string;
  meta: string;
  description: string;
  image: string;
  alt: string;
};

const SLIDER_GAP_PX = 24;

type LoadState = "loading" | "ready" | "error";

type PortfolioPublicPayload = {
  title?: unknown;
  category?: unknown;
  location?: unknown;
  imageUrl?: unknown;
  imageAlt?: unknown;
  description?: unknown;
};

function toLandingProject(item: PortfolioPublicPayload): Project | null {
  if (typeof item.title !== "string" || item.title.length === 0) {
    return null;
  }
  if (typeof item.imageUrl !== "string" || item.imageUrl.length === 0) {
    return null;
  }
  const category = typeof item.category === "string" && item.category.length > 0 ? item.category : "Project";
  const location = typeof item.location === "string" ? item.location : "";
  const imageAlt = typeof item.imageAlt === "string" && item.imageAlt.length > 0 ? item.imageAlt : item.title;
  // No invented copy: an empty description simply renders no paragraph.
  const description = typeof item.description === "string" ? item.description.trim() : "";
  return {
    title: item.title,
    category,
    meta: location,
    description,
    image: item.imageUrl,
    alt: imageAlt,
  };
}

export default function Projects() {
  // Empty-first render keeps SSR/hydration deterministic; the CMS feed fills in.
  // Nothing is invented while the request is in flight or when it fails.
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");
  const sliderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/portfolio-projects/public")
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
              .map((item) => toLandingProject(item as PortfolioPublicPayload))
              .filter((project): project is Project => project !== null)
          : [];
        setProjects(mapped);
        setStatus("ready");
      })
      .catch(() => {
        // No invented cards and no raw error text: a neutral empty state.
        if (!cancelled) {
          setProjects([]);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function slideProject(direction: 1 | -1): void {
    const slider = sliderRef.current;
    if (slider === null) {
      return;
    }
    const card = slider.querySelector(":scope > article");
    const amount =
      card instanceof HTMLElement ? card.offsetWidth + SLIDER_GAP_PX : slider.clientWidth * 0.8;
    slider.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  return (
    <section id="projects" className="relative w-full max-w-full overflow-hidden bg-surface py-20 lg:py-28">
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
        <div className="mb-14">
          <div>
            <div className="mb-3 inline-flex items-center gap-2">
              <span className="h-0.5 w-6 bg-secondary" />
              <span className="text-xs font-bold uppercase tracking-widest text-secondary">PORTFOLIO</span>
            </div>
            <h2 className="text-3xl font-bold text-primary md:text-4xl">Our Projects</h2>
            <p className="mt-2 max-w-xl text-base text-primary/70">
              Pioneering monumental national infrastructure and architectural landmarks built to sovereign engineering
              benchmarks.
            </p>
          </div>
        </div>

        {projects.length > 0 ? (
          <div className="mb-6 flex items-center justify-end gap-2">
          <button
            type="button"
            aria-label="Previous projects"
            onClick={() => slideProject(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline/50 bg-background text-primary transition-colors hover:bg-secondary hover:text-white focus:outline-none"
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
            aria-label="Next projects"
            onClick={() => slideProject(1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline/50 bg-background text-primary transition-colors hover:bg-secondary hover:text-white focus:outline-none"
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
        ) : null}

        {status === "loading" ? (
          <div className="flex gap-6" aria-busy="true">
            {[0, 1, 2].map((slot) => (
              <div
                key={slot}
                className="h-72 w-full animate-pulse rounded-xl bg-background md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-outline/60 bg-background/40 px-6 py-12 text-center">
            <p className="text-sm font-semibold text-primary">
              {status === "error"
                ? "Data proyek sedang tidak dapat dimuat."
                : "Belum ada proyek yang ditampilkan."}
            </p>
            <p className="text-xs text-primary/60">Silakan kembali lagi nanti.</p>
          </div>
        ) : (
        <div
          ref={sliderRef}
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {projects.map((project, index) => (
            <article
              key={`${project.image}-${project.title}-${index}`}
              className="group flex w-full max-w-full shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-outline/40 bg-surface shadow-sm transition-all duration-300 hover:shadow-lg md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
            >
              <div className="relative aspect-video overflow-hidden bg-background">
                {project.image.startsWith("/") ? (
                  <Image
                    src={project.image}
                    alt={project.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                ) : (
                  // Remote CMS URLs bypass next/image so no remotePatterns config is needed.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.image}
                    alt={project.alt}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                )}
                <div className="absolute left-3 top-3">
                  <span className="rounded-md border border-outline/30 bg-surface/90 px-2.5 py-1 text-[11px] font-bold text-secondary backdrop-blur-sm">
                    {project.category}
                  </span>
                </div>
                <div className="absolute bottom-3 right-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <span className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
                    View Detail
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
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <div className="mb-1 text-[11px] text-primary/50">{project.meta}</div>
                  <h3 className="mb-2 text-lg font-bold text-primary transition-colors group-hover:text-secondary">
                    {project.title}
                  </h3>
                  {project.description ? (
                    <p className="line-clamp-2 text-sm text-primary/70">{project.description}</p>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
        )}
      </div>
    </section>
  );
}
