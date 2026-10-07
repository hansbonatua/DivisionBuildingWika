"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type Project = {
  title: string;
  category: string;
  meta: string;
  description: string;
  phase: string;
  kind: string;
  image: string;
  alt: string;
};

const FALLBACK_PROJECTS: Project[] = [
  {
    title: "Lorem Ipsum Construction Project",
    category: "Building",
    meta: "Lorem Ipsum • Dolor Sit Amet",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio praesent libero sed cursus ante dapibus diam.",
    phase: "Completed",
    kind: "Turnkey",
    image: "/asset/hero/7.jpg",
    alt: "Lorem Ipsum Project 1",
  },
  {
    title: "Dolor Sit Amet Infrastructure",
    category: "Infrastructure",
    meta: "Consectetur • Adipiscing Elit",
    description:
      "Sed nisi nulla quis sem at nibh elementum imperdiet duis sagittis ipsum. Praesent mauris fusce nec tellus sed augue.",
    phase: "Completed",
    kind: "Design-Build",
    image: "/asset/hero/14.jpg",
    alt: "Lorem Ipsum Project 2",
  },
  {
    title: "Consectetur Engineering Development",
    category: "Airport",
    meta: "Sed Do • Eiusmod Tempor",
    description:
      "Sed dignissim lacinia nunc curabitur tortor pellentesque nibh. Aenean quam in scelerisque sem at dolor maecenas.",
    phase: "Ongoing",
    kind: "EPC",
    image: "/asset/hero/10.jpg",
    alt: "Lorem Ipsum Project 3",
  },
  {
    title: "Modern Building Solution",
    category: "Energy",
    meta: "Ut Labore • Et Dolore",
    description:
      "Maecenas mattis sed convallis tristique sem proin. Nulla quis lorem ut libero malesuada feugiat donec sodales.",
    phase: "Completed",
    kind: "Greenfield",
    image: "/asset/hero/8.jpg",
    alt: "Lorem Ipsum Project 4",
  },
];

const SLIDER_GAP_PX = 24;

// Generic display copy for API-fed cards (API carries no phase/kind/description).
// Deterministic by design — no business facts are derived from record fields.
const API_CARD_DESCRIPTION =
  "Strategic national project delivered to sovereign engineering benchmarks.";
const API_CARD_PHASE = "Completed";
const API_CARD_KIND = "Turnkey";

type PortfolioPublicPayload = {
  title?: unknown;
  category?: unknown;
  location?: unknown;
  imageUrl?: unknown;
  imageAlt?: unknown;
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
  return {
    title: item.title,
    category,
    meta: location,
    description: API_CARD_DESCRIPTION,
    phase: API_CARD_PHASE,
    kind: API_CARD_KIND,
    image: item.imageUrl,
    alt: imageAlt,
  };
}

export default function Projects() {
  // Fallback-first render keeps SSR/hydration deterministic; API swaps in when valid.
  const [projects, setProjects] = useState<Project[]>(FALLBACK_PROJECTS);
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
        if (cancelled || !Array.isArray(body.data)) {
          return;
        }
        const mapped = body.data
          .map((item) => toLandingProject(item as PortfolioPublicPayload))
          .filter((project): project is Project => project !== null);
        if (mapped.length > 0) {
          setProjects(mapped);
        }
      })
      .catch(() => {
        // Silent fallback: static projects remain. No user-facing error on landing.
        console.warn("Landing projects use static fallback (public API unavailable).");
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
        <div className="mb-14 flex flex-col justify-between md:flex-row md:items-end">
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
          <div className="mt-6 flex items-center space-x-3 md:mt-0">
            <span className="text-xs font-semibold uppercase text-primary/50">Filter:</span>
            <div className="inline-flex rounded-lg border border-outline/50 bg-background p-1">
              <button
                type="button"
                className="rounded bg-surface px-3 py-1 text-xs font-bold text-primary shadow-sm"
              >
                All Sectors
              </button>
              <button
                type="button"
                className="rounded px-3 py-1 text-xs text-primary/70 hover:text-primary"
              >
                Civic
              </button>
              <button
                type="button"
                className="rounded px-3 py-1 text-xs text-primary/70 hover:text-primary"
              >
                Transit
              </button>
            </div>
          </div>
        </div>

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
                  <p className="line-clamp-2 text-sm text-primary/70">{project.description}</p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-outline/20 pt-4 text-xs">
                  <span className="text-primary/50">Phase: {project.phase}</span>
                  <span className="font-semibold text-secondary">Type: {project.kind}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
