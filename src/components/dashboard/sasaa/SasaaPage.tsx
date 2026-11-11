"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProjectPhotoCarousel from "./ProjectPhotoCarousel";
import SasaaStatsGrid from "./SasaaStatsGrid";
import {
  readApiErrorMessage,
  type SasaaData,
  type SasaaProjectOption,
} from "./types";

const PROJECTS_ENDPOINT = "/api/dashboard/sasaa";

function PageHeader({
  selectedId,
  projects,
  loading,
  onSelect,
}: {
  selectedId: string;
  projects: SasaaProjectOption[];
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 border-b border-outline pb-4 lg:flex-row lg:items-end">
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
            Core Enterprise
          </span>
          <span className="text-xs text-primary/50">•</span>
          <span className="text-xs text-primary/50">Master Project</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Dashboard SASAA
        </h1>
        <p className="max-w-3xl text-base text-primary/70">
          Ringkasan eksekutif proyek: foto, MSL, Engineering Database, PDOC, dan
          Knowledge Management.
        </p>
      </div>

      <label className="flex w-full flex-col gap-1.5 text-xs font-bold text-primary/70 lg:w-80">
        Pilih Proyek
        <select
          value={selectedId}
          onChange={(event) => onSelect(event.target.value)}
          disabled={loading || projects.length === 0}
          className="h-11 w-full rounded-lg border border-outline/70 bg-white px-3 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-background disabled:text-primary/50"
        >
          {projects.length === 0 ? (
            <option value="">Belum ada proyek</option>
          ) : (
            projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} — {project.location}
              </option>
            ))
          )}
        </select>
      </label>
    </div>
  );
}

function SasaaSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat dashboard SASAA">
      <span className="sr-only">Memuat data proyek...</span>
      <div className="h-28 animate-pulse rounded-2xl border border-outline/50 bg-background" />
      <div className="h-80 animate-pulse rounded-2xl border border-outline/50 bg-background" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-44 animate-pulse rounded-2xl border border-outline/50 bg-background"
          />
        ))}
      </div>
    </div>
  );
}

function PhotoEmptyState({
  count,
  canManagePhotos,
}: {
  count: number;
  canManagePhotos: boolean;
}) {
  return (
    <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-outline bg-background p-8 text-center">
      <div>
        <p className="text-sm font-bold text-primary">
          {count === 0
            ? "Belum ada foto proyek."
            : `Foto proyek belum lengkap (${count}/4).`}
        </p>
        <p className="mt-1 text-xs text-primary/55">
          Dashboard SASAA menampilkan carousel setelah keempat foto tersedia.
        </p>
        {canManagePhotos ? (
          <Link
            href="/dashboard/master-project/photos"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Kelola Foto Proyek
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function SasaaPage({
  canManagePhotos,
}: {
  canManagePhotos: boolean;
}) {
  const [projects, setProjects] = useState<SasaaProjectOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [data, setData] = useState<SasaaData | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadProjects(): Promise<void> {
      setLoadingProjects(true);
      setProjectsError(null);
      try {
        const response = await fetch(PROJECTS_ENDPOINT, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            await readApiErrorMessage(response, "Gagal memuat daftar proyek."),
          );
        }
        const body = (await response.json()) as { data?: unknown };
        if (!Array.isArray(body.data)) {
          throw new Error("Respons daftar proyek tidak valid.");
        }
        if (!active) return;
        const nextProjects = body.data as SasaaProjectOption[];
        setProjects(nextProjects);
        setSelectedId((current) =>
          nextProjects.some((project) => project.id === current)
            ? current
            : (nextProjects[0]?.id ?? ""),
        );
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setProjectsError(
          error instanceof Error
            ? error.message
            : "Gagal memuat daftar proyek.",
        );
      } finally {
        if (active) setLoadingProjects(false);
      }
    }

    void loadProjects();
    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    async function loadData(): Promise<void> {
      try {
        const response = await fetch(
          `${PROJECTS_ENDPOINT}/${encodeURIComponent(selectedId)}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error(
            await readApiErrorMessage(
              response,
              "Gagal memuat data proyek.",
            ),
          );
        }
        const body = (await response.json()) as { data?: SasaaData };
        if (!body.data || !body.data.project || !body.data.metrics) {
          throw new Error("Respons data proyek tidak valid.");
        }
        if (!active) return;
        setData(body.data);
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setDataError(
          error instanceof Error
            ? error.message
            : "Gagal memuat data proyek.",
        );
      }
    }

    void loadData();
    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken, selectedId]);

  const noProjects =
    !loadingProjects && !projectsError && projects.length === 0;
  // Derived, not stored: a selection with neither data nor an error is loading.
  // Clearing (or setting) those two values happens in event handlers, so no
  // effect needs to synchronously set state when the selection changes.
  const loadingData =
    selectedId !== "" && data === null && dataError === null;

  function selectProject(id: string): void {
    setSelectedId(id);
    setData(null);
    setDataError(null);
  }

  function retry(): void {
    setData(null);
    setDataError(null);
    setReloadToken((value) => value + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        selectedId={selectedId}
        projects={projects}
        loading={loadingProjects}
        onSelect={selectProject}
      />

      {projectsError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
        >
          <p className="font-semibold">{projectsError}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      ) : null}

      {loadingProjects ? (
        <SasaaSkeleton />
      ) : noProjects ? (
        <div className="rounded-2xl border border-dashed border-outline bg-background p-10 text-center">
          <p className="text-sm font-bold text-primary">Belum ada Master Project.</p>
          <p className="mt-1 text-xs text-primary/55">
            Tambahkan Master Project terlebih dahulu untuk melihat Dashboard SASAA.
          </p>
        </div>
      ) : loadingData ? (
        <SasaaSkeleton />
      ) : dataError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
        >
          <p className="font-semibold">{dataError}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      ) : data ? (
        <>
          <section className="rounded-2xl border border-outline bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                  Proyek Terpilih
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-primary">
                  {data.project.name}
                </h2>
                <p className="mt-1 text-sm text-primary/60">
                  {data.project.location} • {data.project.year}
                </p>
              </div>
              <div className="rounded-xl border border-outline/70 bg-background px-4 py-3 sm:min-w-52">
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary/45">
                  PIC Proyek
                </p>
                <p className="mt-1 text-sm font-semibold text-primary">
                  {data.project.pic.name}
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="sasaa-photo-title" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="sasaa-photo-title" className="text-base font-bold text-primary">
                  Foto Proyek
                </h2>
                <p className="text-xs text-primary/50">
                  Empat dokumentasi visual utama proyek.
                </p>
              </div>
              {data.photosComplete ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                  Lengkap 4/4
                </span>
              ) : null}
            </div>
            {data.photosComplete ? (
              <ProjectPhotoCarousel
                photos={data.photos}
                projectName={data.project.name}
              />
            ) : (
              <PhotoEmptyState
                count={data.photos.length}
                canManagePhotos={canManagePhotos}
              />
            )}
          </section>

          <section aria-labelledby="sasaa-stats-title" className="space-y-3">
            <div>
              <h2 id="sasaa-stats-title" className="text-base font-bold text-primary">
                Ringkasan Kinerja
              </h2>
              <p className="text-xs text-primary/50">
                Agregat data proyek tanpa membuka record mentah MSL.
              </p>
            </div>
            <SasaaStatsGrid metrics={data.metrics} />
          </section>
        </>
      ) : null}
    </div>
  );
}
