"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  CMS_IMAGE_ACCEPT_ATTRIBUTE,
  CMS_IMAGE_FORMAT_HINT,
  CMS_IMAGE_MAX_BYTES,
  cmsImageDefaultMimeType,
  isCmsImageAllowedFileName,
} from "@/lib/cms/image-source";
import { buildCmsBlobPathname } from "@/lib/cms/storage-path";
import { cmsImageUploadErrorMessage } from "@/lib/cms/use-cms-image-field";
import OrganizationStructureViewer from "./OrganizationStructureViewer";
import {
  organizationStructureErrorMessage,
  type OrganizationStructureApiItem,
  type OrganizationStructureApiResponse,
} from "./organization-structure-api.types";

// Struktur Organisasi — one chart, two experiences.
//
// `canManage` is decided by the SERVER page from the session (see the route's
// page.tsx); this component never reads a role and never guesses. Hiding the
// Admin controls here is presentation only — the API re-checks the MANAGE
// permission on every mutation and stays the security boundary.
//
// Upload reuses the shared CMS pipeline exactly as the landing modules do: the
// browser uploads straight to the public Blob store under
// `cms/organization/<uuid>/<file>`, then the metadata save re-verifies that
// object server-side. Replacing an existing chart leaves the old object to the
// backend, which deletes it only after the new row is committed.

const API_PATH = "/api/organization-structure";
const CMS_UPLOAD_ENDPOINT = "/api/cms/upload";
const CMS_CLEANUP_ENDPOINT = "/api/cms/upload/cleanup";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * "29 Oktober 2026, 14:30 WIB" — always Asia/Jakarta, never the browser's own
 * timezone, so every role reads the same timestamp regardless of device.
 */
function formatJakartaTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = DATE_TIME_FORMATTER.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  const day = value("day");
  const month = value("month");
  const year = value("year");
  // `hour: "2-digit"` can render midnight as "24" in some ICU builds; normalize
  // to a plain 00–23 clock and format the separator ourselves.
  const hour = value("hour") === "24" ? "00" : value("hour");
  return `${day} ${month} ${year}, ${hour}:${value("minute")} WIB`;
}

export default function OrganizationStructurePage({
  canManage,
}: {
  canManage: boolean;
}) {
  const [item, setItem] = useState<OrganizationStructureApiItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = uploading || deleting;

  // Every state update here happens in a promise continuation (after the
  // fetch), so mounting the page cannot cascade renders, and the `active` flag
  // stops a slow response from landing on an unmounted page.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch(API_PATH, { cache: "no-store" });
        const body: unknown = await response.json().catch(() => null);
        if (!active) return;
        if (!response.ok) {
          setError(
            organizationStructureErrorMessage(
              body,
              "Gagal memuat struktur organisasi.",
            ),
          );
          return;
        }
        setItem((body as OrganizationStructureApiResponse)?.data ?? null);
      } catch {
        if (active) {
          setError(
            "Gagal memuat struktur organisasi. Periksa koneksi lalu coba lagi.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  // Retry re-runs the effect; the reset happens in an event handler so the
  // skeleton (never the empty state) is what remains on screen meanwhile.
  const retry = useCallback((): void => {
    setLoading(true);
    setError(null);
    setReloadKey((current) => current + 1);
  }, []);

  /**
   * Best-effort removal of an object uploaded by a save that then failed, so a
   * failed metadata write does not leave an orphaned chart in the store. Never
   * throws: the save error is what the Admin needs to see.
   */
  const cleanupOrphan = useCallback(async (pathname: string): Promise<void> => {
    try {
      const response = await fetch(CMS_CLEANUP_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathname }),
      });
      if (!response.ok) {
        console.warn("Organization structure cleanup was refused", response.status);
      }
    } catch (cleanupError) {
      console.warn("Organization structure cleanup failed", cleanupError);
    }
  }, []);

  async function handleFileSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    // Reset immediately so re-picking the SAME file still fires onChange.
    event.target.value = "";
    if (!file || busy) return;

    setError(null);
    if (!isCmsImageAllowedFileName(file.name)) {
      setError("Format gambar tidak didukung. Gunakan JPG, PNG, WEBP, atau AVIF.");
      return;
    }
    if (file.size > CMS_IMAGE_MAX_BYTES) {
      setError("Ukuran gambar melebihi batas 5 MB.");
      return;
    }
    const pathname = buildCmsBlobPathname("organization", file.name);
    if (!pathname) {
      setError("Nama atau format file gambar tidak valid.");
      return;
    }

    setUploading(true);
    setUploadPercent(0);
    try {
      let blobUrl: string;
      let blobPathname: string;
      try {
        const blob = await upload(pathname, file, {
          access: "public",
          contentType:
            file.type || cmsImageDefaultMimeType(file.name) || undefined,
          handleUploadUrl: CMS_UPLOAD_ENDPOINT,
          multipart: false,
          onUploadProgress: (progress) => {
            const percentage = Number(progress.percentage);
            if (Number.isFinite(percentage)) {
              setUploadPercent(
                Math.max(0, Math.min(100, Math.round(percentage))),
              );
            }
          },
        });
        blobUrl = blob.url;
        blobPathname = blob.pathname;
      } catch (uploadError) {
        setError(cmsImageUploadErrorMessage(uploadError));
        return;
      }

      try {
        const response = await fetch(API_PATH, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: blobUrl,
            imageSource: "upload",
            blobPathname,
          }),
        });
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          // The row was NOT saved, so the object we just uploaded is unused.
          await cleanupOrphan(blobPathname);
          setError(
            organizationStructureErrorMessage(
              body,
              "Gagal menyimpan struktur organisasi. Coba lagi.",
            ),
          );
          return;
        }
        setItem((body as { data: OrganizationStructureApiItem }).data);
      } catch {
        await cleanupOrphan(blobPathname);
        setError(
          "Gagal menyimpan struktur organisasi. Periksa koneksi lalu coba lagi.",
        );
      }
    } finally {
      setUploading(false);
      setUploadPercent(null);
    }
  }

  async function handleDelete(): Promise<void> {
    if (busy) return;
    if (!window.confirm("Hapus struktur organisasi saat ini?")) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(API_PATH, { method: "DELETE" });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(
          organizationStructureErrorMessage(
            body,
            "Gagal menghapus struktur organisasi.",
          ),
        );
        return;
      }
      setItem(null);
    } catch {
      setError("Gagal menghapus struktur organisasi. Periksa koneksi lalu coba lagi.");
    } finally {
      setDeleting(false);
    }
  }

  const uploadLabel = uploading
    ? uploadPercent === null
      ? "Mengunggah..."
      : `Mengunggah ${uploadPercent}%`
    : item
      ? "Ganti Gambar"
      : "Upload Gambar";

  return (
    <div className="space-y-6">
      <div className="border-b border-outline/40 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Struktur Organisasi
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-primary/70">
          {canManage
            ? "Kelola struktur organisasi perusahaan."
            : "Struktur organisasi perusahaan."}
        </p>
      </div>

      {canManage ? (
        <input
          ref={fileInputRef}
          type="file"
          accept={CMS_IMAGE_ACCEPT_ATTRIBUTE}
          className="hidden"
          disabled={busy}
          onChange={(event) => void handleFileSelected(event)}
        />
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <p className="font-semibold">{error}</p>
          {!item && !loading ? (
            <button
              type="button"
              onClick={retry}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-secondary"
            >
              Coba Lagi
            </button>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div
          aria-busy="true"
          className="rounded-lg border border-outline bg-surface p-4 shadow-sm sm:p-6"
        >
          <div className="h-3.5 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-[45vh] w-full animate-pulse rounded bg-slate-100" />
          <p className="mt-3 text-xs font-medium text-primary/50">
            Memuat struktur organisasi...
          </p>
        </div>
      ) : !item ? (
        <div className="rounded-lg border border-dashed border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">
            Struktur organisasi belum tersedia.
          </p>
          {canManage ? (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
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
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
                <span>{uploadLabel}</span>
              </button>
              <p className="mt-3 text-[11px] text-primary/50">
                {CMS_IMAGE_FORMAT_HINT}
              </p>
            </>
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border border-outline bg-surface p-4 shadow-sm sm:p-6">
          {canManage ? (
            <div className="flex flex-col gap-3 border-b border-outline/40 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Terakhir diperbarui
                </p>
                <p className="text-xs text-primary/70">
                  {formatJakartaTimestamp(item.updatedAt)}
                  {item.updatedByName ? ` oleh ${item.updatedByName}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
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
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                  <span>{uploadLabel}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
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
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  </svg>
                  <span>{deleting ? "Menghapus..." : "Hapus Gambar"}</span>
                </button>
              </div>
            </div>
          ) : null}

          <div className={canManage ? "pt-4" : undefined}>
            <OrganizationStructureViewer
              imageUrl={item.imageUrl}
              fileName={item.fileName}
            />
          </div>
        </div>
      )}
    </div>
  );
}
