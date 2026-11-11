"use client";

import { useEffect, useState } from "react";
import PhotoUploadDialog from "./PhotoUploadDialog";
import {
  readPhotoApiError,
  type MasterProjectPhoto,
  type MasterProjectPhotoRow,
  type ProjectPhotosApiData,
} from "./photo-types";

type ProjectPhotoRow = MasterProjectPhotoRow & {
  photos: MasterProjectPhoto[] | null;
};

const headerCell =
  "whitespace-nowrap border-b border-outline bg-background px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";
const bodyCell =
  "border-b border-outline/50 px-4 py-3 align-top text-xs text-primary/80";

function TableSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((row) => (
        <tr key={row} className="border-b border-outline/40">
          {[0, 1, 2, 3, 4, 5, 6].map((cell) => (
            <td key={cell} className="px-4 py-4">
              <div className="h-3 w-full max-w-32 animate-pulse rounded bg-slate-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function PhotoStatusBadge({
  photos,
  loading,
}: {
  photos: MasterProjectPhoto[] | null;
  loading: boolean;
}) {
  if (loading && photos === null) {
    return <span className="h-3 w-12 animate-pulse rounded bg-slate-100" />;
  }
  if (photos === null) {
    return <span className="text-xs font-semibold text-primary/40">—</span>;
  }
  const complete = photos.length === 4;
  const partial = photos.length > 0 && !complete;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ${
        complete
          ? "bg-emerald-50 text-emerald-700"
          : partial
            ? "bg-amber-50 text-amber-700"
            : "bg-slate-100 text-slate-600"
      }`}
    >
      {photos.length}/4
    </span>
  );
}

export default function PhotosManagePage() {
  const [rows, setRows] = useState<ProjectPhotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [dialogRow, setDialogRow] = useState<ProjectPhotoRow | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadPhotos(projects: MasterProjectPhotoRow[]): Promise<void> {
      if (projects.length === 0) {
        setPhotosLoading(false);
        return;
      }
      setPhotosLoading(true);
      await Promise.all(
        projects.map(async (project) => {
          try {
            const response = await fetch(
              `/api/master-project/${encodeURIComponent(project.id)}/photos`,
              { cache: "no-store", signal: controller.signal },
            );
            if (!response.ok) {
              throw new Error("PHOTO_STATUS_FAILED");
            }
            const body = (await response.json()) as {
              data?: ProjectPhotosApiData;
            };
            const photos = Array.isArray(body.data?.photos)
              ? body.data.photos
              : null;
            if (!active) return;
            setRows((previous) =>
              previous.map((row) =>
                row.id === project.id ? { ...row, photos } : row,
              ),
            );
          } catch {
            if (!active || controller.signal.aborted) return;
            setError(
              "Status foto sebagian proyek gagal dimuat. Coba lagi.",
            );
            setRows((previous) =>
              previous.map((row) =>
                row.id === project.id ? { ...row, photos: null } : row,
              ),
            );
          }
        }),
      );
      if (active) setPhotosLoading(false);
    }

    async function loadRows(): Promise<void> {
      setLoading(true);
      setError(null);
      setFeedback(null);
      try {
        const response = await fetch("/api/master-project", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            await readPhotoApiError(response, "Gagal memuat Master Project."),
          );
        }
        const body = (await response.json()) as { data?: unknown };
        if (!Array.isArray(body.data)) {
          throw new Error("Respons daftar proyek tidak valid.");
        }
        if (!active) return;
        const projects = body.data as MasterProjectPhotoRow[];
        setRows(projects.map((project) => ({ ...project, photos: null })));
        setLoading(false);
        await loadPhotos(projects);
      } catch (loadError) {
        if (!active || controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Gagal memuat Master Project.",
        );
        setPhotosLoading(false);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadRows();
    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken]);

  const completeCount = rows.filter((row) => row.photos?.length === 4).length;

  function handleSaved(projectId: string, photos: MasterProjectPhoto[]): void {
    setRows((previous) =>
      previous.map((row) =>
        row.id === projectId ? { ...row, photos } : row,
      ),
    );
    setDialogRow(null);
    setFeedback("Foto proyek berhasil disimpan.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
              Core Enterprise
            </span>
            <span className="text-xs text-primary/50">•</span>
            <span className="text-xs text-primary/50">Master Project</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Kelola Foto Proyek
          </h1>
          <p className="max-w-3xl text-base text-primary/70">
            Kelola tepat empat foto untuk setiap Master Project.
          </p>
        </div>
        <div className="rounded-xl border border-outline/70 bg-background px-4 py-3 text-right">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary/45">
            Foto Lengkap
          </p>
          <p className="mt-1 text-sm font-bold tabular-nums text-primary">
            {loading ? "—" : `${completeCount}/${rows.length} proyek`}
          </p>
        </div>
      </div>

      {feedback ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"
        >
          {feedback}
        </div>
      ) : null}

      {error && rows.length > 0 ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setReloadToken((value) => value + 1)}
            className="rounded border border-red-300 bg-white px-3 py-1.5 font-bold text-red-700 transition-colors hover:bg-red-100"
          >
            Coba Lagi
          </button>
        </div>
      ) : null}

      <section className="rounded-lg border border-outline bg-surface shadow-sm">
        {error && rows.length === 0 ? (
          <div role="alert" className="p-8 text-center">
            <p className="text-sm font-bold text-primary">{error}</p>
            <button
              type="button"
              onClick={() => setReloadToken((value) => value + 1)}
              className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
            >
              Coba Lagi
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1 border-b border-outline px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-primary">Daftar Proyek</h2>
                <p className="mt-0.5 text-xs text-primary/50">
                  Status kelengkapan empat slot foto per proyek.
                </p>
              </div>
              <p className="text-xs font-semibold text-primary/60" aria-live="polite">
                {photosLoading ? "Memuat status foto..." : `${rows.length} proyek`}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-xs">
                <thead>
                  <tr>
                    <th scope="col" className={`${headerCell} w-16`}>
                      No
                    </th>
                    <th scope="col" className={headerCell}>
                      Nama Proyek
                    </th>
                    <th scope="col" className={headerCell}>
                      Lokasi
                    </th>
                    <th scope="col" className={`${headerCell} w-20`}>
                      Tahun
                    </th>
                    <th scope="col" className={headerCell}>
                      PIC
                    </th>
                    <th scope="col" className={`${headerCell} w-28`}>
                      Foto
                    </th>
                    <th scope="col" className={`${headerCell} text-right`}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton />
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-xs font-medium text-primary/60"
                      >
                        Belum ada Master Project.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.id} className="transition-colors hover:bg-background/60">
                        <td className={`${bodyCell} tabular-nums text-primary/50`}>
                          {index + 1}
                        </td>
                        <td className={`${bodyCell} min-w-56 font-semibold text-primary`}>
                          {row.name}
                        </td>
                        <td className={`${bodyCell} min-w-40`}>{row.location}</td>
                        <td className={`${bodyCell} tabular-nums`}>
                          {row.year ?? "—"}
                        </td>
                        <td className={`${bodyCell} min-w-36`}>
                          {row.pic?.name ?? "—"}
                        </td>
                        <td className={bodyCell}>
                          <PhotoStatusBadge
                            photos={row.photos}
                            loading={photosLoading}
                          />
                        </td>
                        <td className={`${bodyCell} whitespace-nowrap text-right`}>
                          <button
                            type="button"
                            onClick={() => setDialogRow(row)}
                            disabled={row.photos === null}
                            title={
                              row.photos === null
                                ? "Status foto belum tersedia"
                                : undefined
                            }
                            className="rounded-lg border border-outline bg-white px-3 py-1.5 text-xs font-bold text-secondary transition-colors hover:border-secondary/40 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            Kelola Foto
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {dialogRow && dialogRow.photos ? (
        <PhotoUploadDialog
          project={{ id: dialogRow.id, name: dialogRow.name }}
          initialPhotos={dialogRow.photos}
          onClose={() => setDialogRow(null)}
          onSaved={(photos) => handleSaved(dialogRow.id, photos)}
        />
      ) : null}
    </div>
  );
}
