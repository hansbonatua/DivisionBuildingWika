"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { canManageTemplateForm } from "@/lib/template-form/access";

type TemplateFormApiItem = {
  id: string;
  name: string;
  fileUrl: string;
  uploaderPic?: { id?: string; name?: string } | null;
};

const EMPTY_VALUE = "\u2014";

const headerCell =
  "whitespace-nowrap border-b border-outline bg-background px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";

const bodyCell =
  "border-b border-outline/50 px-4 py-3 align-top text-xs text-primary/80";

const skeletonRows = ["first", "second", "third", "fourth"];

function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? trimmed : null;
  } catch {
    return null;
  }
}

function displayText(value: string | null | undefined): string {
  return typeof value === "string" && value.trim() !== "" ? value : EMPTY_VALUE;
}

function TableSkeleton() {
  return (
    <>
      {skeletonRows.map((row) => (
        <tr key={row} className="border-b border-outline/40">
          <td className="px-4 py-4">
            <div className="h-3 w-48 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-36 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="ml-auto h-3 w-24 animate-pulse rounded bg-slate-100" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function TemplateFormTable({
  currentUserRole,
}: {
  currentUserRole: string;
}) {
  const [rows, setRows] = useState<TemplateFormApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const canManage = canManageTemplateForm(currentUserRole);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadRows(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/template-form", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.status === 401 || response.status === 403) {
          throw new Error("UNAUTHORIZED");
        }
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const body = (await response.json()) as { data?: unknown };
        if (!Array.isArray(body.data)) {
          throw new Error("INVALID_RESPONSE");
        }
        if (active) {
          setRows(body.data as TemplateFormApiItem[]);
        }
      } catch (err) {
        if (!active || controller.signal.aborted) {
          return;
        }
        setError(
          err instanceof Error && err.message === "UNAUTHORIZED"
            ? "Anda tidak memiliki akses ke Template & Form."
            : "Gagal memuat Template & Form.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadRows();

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
              Core Enterprise
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Template &amp; Form
          </h1>
          <p className="max-w-3xl text-base text-primary/70">
            Daftar template dan form yang digunakan pada WIBEX Building Division.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Tambah Template/Form tersedia pada fase berikutnya"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60"
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
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            <span>Tambah Template/Form</span>
          </button>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm"
        >
          <p className="text-sm font-bold text-primary">{error}</p>
          <p className="mt-1 text-xs text-primary/60">
            Periksa koneksi lalu coba kembali.
          </p>
          <button
            type="button"
            onClick={() => setReloadToken((value) => value + 1)}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      ) : (
        <section
          aria-label="Daftar Template & Form"
          aria-busy={loading}
          className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm"
        >
          <div className="flex flex-col gap-1 border-b border-outline px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-primary">
                Daftar Template &amp; Form
              </h2>
              <p className="mt-0.5 text-xs text-primary/50">
                Template dan form yang dapat diakses oleh seluruh tim.
              </p>
            </div>
            {!loading ? (
              <span className="text-xs font-semibold text-primary/60">
                {rows.length} template/form
              </span>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-xs">
              <thead>
                <tr>
                  <th scope="col" className={headerCell}>
                    Nama Template / Form
                  </th>
                  <th scope="col" className={headerCell}>
                    File Template / Form
                  </th>
                  <th scope="col" className={headerCell}>
                    Pengupload PIC
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
                      colSpan={4}
                      className="px-4 py-10 text-center text-xs font-medium text-primary/60"
                    >
                      <p className="text-sm font-medium text-primary/70">
                        Belum ada Template &amp; Form.
                      </p>
                      {canManage ? (
                        <p className="mt-1 text-xs text-primary/50">
                          Tambahkan Template &amp; Form untuk mulai mengisi daftar.
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ) : (
                  rows.map((item) => {
                    const fileUrl = safeHttpUrl(item.fileUrl);
                    const picName = item.uploaderPic?.name;
                    return (
                      <tr
                        key={item.id}
                        className="transition-colors hover:bg-background/60"
                      >
                        <td
                          className={`${bodyCell} min-w-64 font-semibold text-primary`}
                        >
                          {displayText(item.name)}
                        </td>
                        <td className={`${bodyCell} min-w-40 whitespace-nowrap`}>
                          {fileUrl ? (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded border border-outline/50 px-2.5 py-1 text-[11px] font-bold text-secondary transition-colors hover:bg-secondary hover:text-white"
                            >
                              <span>Buka File</span>
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M15 3h6v6" />
                                <path d="M10 14 21 3" />
                                <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
                              </svg>
                            </a>
                          ) : (
                            <span className="text-primary/40">{EMPTY_VALUE}</span>
                          )}
                        </td>
                        <td className={`${bodyCell} min-w-48`}>
                          {displayText(picName)}
                        </td>
                        <td
                          className={`${bodyCell} min-w-40 whitespace-nowrap text-right`}
                        >
                          {canManage ? (
                            <>
                              <Link
                                href={`/dashboard/template-form/${item.id}/edit`}
                                className="rounded px-2.5 py-1 text-xs font-bold text-secondary hover:bg-blue-50"
                              >
                                Edit
                              </Link>
                              <button
                                type="button"
                                disabled
                                aria-disabled="true"
                                title="Hapus Template/Form tersedia pada fase berikutnya"
                                className="cursor-not-allowed rounded px-2.5 py-1 text-xs font-bold text-slate-300"
                              >
                                Hapus
                              </button>
                            </>
                          ) : (
                            <span className="text-primary/40">{EMPTY_VALUE}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
