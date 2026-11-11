"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  CMS_IMAGE_ACCEPT_ATTRIBUTE,
  CMS_IMAGE_FORMAT_HINT,
  CMS_IMAGE_MAX_BYTES,
  cmsImageDefaultMimeType,
  isCmsImageAllowedFileName,
  isCmsImageContentType,
  normalizeCmsImageMimeType,
} from "@/lib/cms/image-source";
import { cmsImageUploadErrorMessage } from "@/lib/cms/use-cms-image-field";
import {
  buildProjectPhotoPathname,
  parseProjectPhotoPathname,
} from "@/lib/dashboard/project-photo-storage";
import {
  readPhotoApiError,
  type MasterProjectPhoto,
} from "./photo-types";

const SLOTS = [1, 2, 3, 4] as const;
const UPLOAD_ENDPOINT = "/api/master-project/photos/upload";

type SlotPhoto = {
  slot: number;
  url: string;
  pathname: string;
  alt: string;
  fileName: string;
};

type SlotState = SlotPhoto | null;

function pathnameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

function fileNameFromPathname(pathname: string): string {
  const segment = pathname.split("/").pop() ?? "";
  return segment.replace(/^[1-4]-/, "") || "Foto tersimpan";
}

function buildInitialSlots(
  projectId: string,
  photos: MasterProjectPhoto[],
): SlotState[] {
  return SLOTS.map((slot) => {
    const photo = photos.find((item) => item.slot === slot);
    if (!photo) return null;
    const derived = pathnameFromUrl(photo.url);
    const parsed = derived ? parseProjectPhotoPathname(derived) : null;
    const pathname =
      parsed && parsed.projectId === projectId && parsed.slot === slot
        ? derived
        : "";
    return {
      slot,
      url: photo.url,
      pathname: pathname ?? "",
      alt: photo.alt,
      fileName: pathname ? fileNameFromPathname(pathname) : "Foto tersimpan",
    };
  });
}

export default function PhotoUploadDialog({
  project,
  initialPhotos,
  onClose,
  onSaved,
}: {
  project: { id: string; name: string };
  initialPhotos: MasterProjectPhoto[];
  onClose: () => void;
  onSaved: (photos: MasterProjectPhoto[]) => void;
}) {
  const [slots, setSlots] = useState<SlotState[]>(() =>
    buildInitialSlots(project.id, initialPhotos),
  );
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const busy = uploadingSlot !== null || saving;
  const filledCount = slots.filter((slot) => slot?.url && slot?.pathname).length;
  const canSave = filledCount === 4 && !busy;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose]);

  function handleTab(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function updateSlot(slotNumber: number, next: SlotState): void {
    setSlots((previous) =>
      previous.map((slot, index) => (SLOTS[index] === slotNumber ? next : slot)),
    );
  }

  async function handleFileSelected(
    slotNumber: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
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
    const mime = normalizeCmsImageMimeType(file.type);
    if (mime && !isCmsImageContentType(mime)) {
      setError("Tipe file gambar tidak didukung.");
      return;
    }
    const pathname = buildProjectPhotoPathname(
      project.id,
      slotNumber,
      file.name,
    );
    if (!pathname) {
      setError("Nama atau format file gambar tidak valid.");
      return;
    }

    setUploadingSlot(slotNumber);
    setUploadPercent(0);
    try {
      const blob = await upload(pathname, file, {
        access: "public",
        contentType:
          file.type || cmsImageDefaultMimeType(file.name) || undefined,
        handleUploadUrl: UPLOAD_ENDPOINT,
        clientPayload: JSON.stringify({
          projectId: project.id,
          slot: slotNumber,
        }),
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

      const parsed = parseProjectPhotoPathname(blob.pathname);
      if (
        !parsed ||
        parsed.projectId !== project.id ||
        parsed.slot !== slotNumber
      ) {
        throw new Error("UPLOAD_PATH_MISMATCH");
      }

      updateSlot(slotNumber, {
        slot: slotNumber,
        url: blob.url,
        pathname: blob.pathname,
        alt: `${project.name} - foto ${slotNumber}`,
        fileName: fileNameFromPathname(blob.pathname),
      });
    } catch (uploadError) {
      setError(cmsImageUploadErrorMessage(uploadError));
    } finally {
      setUploadingSlot(null);
      setUploadPercent(null);
    }
  }

  function handleRemove(slotNumber: number): void {
    if (busy) return;
    setError(null);
    updateSlot(slotNumber, null);
  }

  async function handleSave(): Promise<void> {
    if (!canSave) {
      setError("Isi keempat slot foto terlebih dahulu.");
      return;
    }
    const photos = slots
      .filter((slot): slot is SlotPhoto => slot !== null)
      .map((slot) => ({
        slot: slot.slot,
        url: slot.url,
        pathname: slot.pathname,
        alt: slot.alt,
      }));
    if (photos.length !== 4 || photos.some((photo) => !photo.pathname)) {
      setError("Pathname foto tidak lengkap. Ganti foto yang bermasalah.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/master-project/${encodeURIComponent(project.id)}/photos`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photos }),
        },
      );
      if (!response.ok) {
        setError(
          await readPhotoApiError(
            response,
            "Gagal menyimpan foto proyek. Coba lagi.",
          ),
        );
        return;
      }
      const body = (await response.json()) as {
        data?: { photosComplete?: boolean };
      };
      if (body.data?.photosComplete !== true) {
        setError("Respons simpan foto tidak valid. Muat ulang lalu coba lagi.");
        return;
      }
      onSaved(
        photos.map((photo) => ({
          slot: photo.slot,
          url: photo.url,
          alt: photo.alt,
        })),
      );
    } catch {
      setError(
        "Gagal menyimpan foto proyek. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-upload-title"
        aria-describedby="photo-upload-description"
        aria-busy={busy}
        onKeyDown={handleTab}
        className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-outline px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-secondary">
              Kelola Foto Proyek
            </p>
            <h2 id="photo-upload-title" className="mt-1 text-lg font-bold text-primary">
              {project.name}
            </h2>
            <p id="photo-upload-description" className="mt-0.5 text-xs text-primary/55">
              Unggah tepat empat foto. Perubahan tersimpan setelah tombol Simpan.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Tutup dialog"
            className="rounded-lg border border-outline bg-white p-2 text-primary/60 transition-colors hover:bg-background hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
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
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {error ? (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
            >
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {SLOTS.map((slotNumber, index) => {
              const slot = slots[index];
              const isUploading = uploadingSlot === slotNumber;
              return (
                <div
                  key={slotNumber}
                  className="rounded-xl border border-outline bg-background/40 p-3"
                >
                  <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-outline/60 bg-slate-100">
                    {slot?.url ? (
                      <img
                        src={slot.url}
                        alt={slot.alt}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-primary/40">
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <rect width="18" height="18" x="3" y="3" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="m21 15-5-5L5 21" />
                        </svg>
                        <span className="text-[11px] font-semibold">
                          Belum ada foto
                        </span>
                      </div>
                    )}

                    <span className="absolute left-2 top-2 rounded-full bg-slate-950/65 px-2.5 py-1 text-[10px] font-bold text-white">
                      Foto {slotNumber}
                    </span>

                    {slot ? (
                      <button
                        type="button"
                        onClick={() => handleRemove(slotNumber)}
                        disabled={busy}
                        aria-label={`Hapus foto slot ${slotNumber}`}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-red-700 shadow-sm transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" />
                        </svg>
                      </button>
                    ) : null}

                    {isUploading ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 px-6">
                        <p className="text-xs font-bold text-primary">
                          Mengunggah {uploadPercent ?? 0}%
                        </p>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-slate-200">
                          <div
                            className="h-1.5 rounded bg-secondary transition-all"
                            style={{ width: `${uploadPercent ?? 0}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-primary">
                        Foto {slotNumber}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-primary/50" title={slot?.fileName}>
                        {slot?.fileName ?? "Belum dipilih"}
                      </p>
                    </div>
                    <input
                      ref={(element) => {
                        inputRefs.current[index] = element;
                      }}
                      type="file"
                      accept={CMS_IMAGE_ACCEPT_ATTRIBUTE}
                      className="hidden"
                      disabled={busy}
                      onChange={(event) => void handleFileSelected(slotNumber, event)}
                    />
                    <button
                      type="button"
                      onClick={() => inputRefs.current[index]?.click()}
                      disabled={busy}
                      className="shrink-0 rounded-lg border border-outline bg-white px-3 py-1.5 text-[11px] font-bold text-primary transition-colors hover:border-secondary/40 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {slot ? "Ganti" : "Upload"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-[11px] text-primary/45">
            {CMS_IMAGE_FORMAT_HINT}. Foto lama dihapus setelah penyimpanan berhasil.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-outline bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs font-semibold text-primary/60" aria-live="polite">
            {filledCount}/4 foto siap disimpan
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-outline bg-white px-4 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canSave}
              className="rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan 4 Foto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
