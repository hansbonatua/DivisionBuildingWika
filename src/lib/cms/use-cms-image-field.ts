"use client";

import { useCallback, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  CMS_IMAGE_MAX_BYTES,
  cmsImageDefaultMimeType,
  cmsImageFileExtension,
  isCmsImageAllowedFileName,
  type CmsImageSelectionType,
} from "@/lib/cms/image-source";
import {
  buildCmsBlobPathname,
  type CmsUploadModule,
} from "@/lib/cms/storage-path";

// Shared client-side image state machine for every CMS module.
//
// Owns exactly the parts that must behave identically in Hero, Portfolio,
// Green Building, Clients and Social Media — and nothing about layout:
//   - which source is selected (upload / external, plus the optional "none"
//     state Social Media opts into via `allowNone`) and the URL draft;
//   - the pending file, its object-URL preview and validation;
//   - the direct-to-Blob upload, its progress and error mapping;
//   - resolving the final `{ imageUrl, imageSource, blobPathname }` trio;
//   - removing a freshly uploaded object when the metadata save fails.
//
// Each form keeps its own visual frame (Hero's inline block, the Project media
// card, the certificate row) and calls `resolveSubmission()` inside its submit
// handler, so the upload/ownership rules can never drift between modules.

export type CmsImageSubmission = {
  imageUrl: string;
  imageSource: CmsImageSelectionType;
  blobPathname: string | null;
  // Set only when THIS submit uploaded a new object, so a failed metadata save
  // can clean the fresh orphan instead of leaving it behind.
  uploadedPathname: string | null;
};

export type CmsImageFieldInitial = {
  imageUrl: string;
  source: CmsImageSelectionType;
  blobPathname: string | null;
};

const CMS_UPLOAD_ENDPOINT = "/api/cms/upload";
const CMS_CLEANUP_ENDPOINT = "/api/cms/upload/cleanup";

// Maps SDK/HTTP failures to something an editor can act on. Never surfaces a
// token, a store name or a raw SDK message.
export function cmsImageUploadErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/too large|maximum size|size limit/i.test(message)) {
    return "Ukuran gambar melebihi batas 5 MB.";
  }
  if (/content type|not allowed|unsupported/i.test(message)) {
    return "Format gambar tidak didukung. Gunakan JPG, PNG, WEBP, atau AVIF.";
  }
  if (/unauthori|forbidden|401|403/i.test(message)) {
    return "Sesi Anda tidak memiliki izin mengunggah gambar.";
  }
  return "Gagal mengunggah gambar. Periksa koneksi lalu coba lagi.";
}

export function useCmsImageField(options: {
  module: CmsUploadModule;
  // Stored image of the record being edited. Absent/null on create.
  initial?: CmsImageFieldInitial | null;
  // Source preselected on create. Defaults to upload (the new business goal).
  defaultSource?: CmsImageSelectionType;
  // Opt in to the third state, where the record is published WITHOUT an image
  // (Social Media's curated feed). Modules whose image is mandatory leave this
  // off: "none" is then neither selectable nor resolvable.
  allowNone?: boolean;
}) {
  const { module, initial, defaultSource = "upload", allowNone = false } = options;

  const [sourceMode, setSourceMode] = useState<CmsImageSelectionType>(
    initial ? initial.source : defaultSource,
  );
  const [urlValue, setUrlValue] = useState(initial?.imageUrl ?? "");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const releasePreview = useCallback((): void => {
    setPendingPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  const selectFile = useCallback(
    (file: File): void => {
      setError(null);
      if (!isCmsImageAllowedFileName(file.name)) {
        setError("Format gambar tidak didukung. Gunakan JPG, PNG, WEBP, atau AVIF.");
        return;
      }
      if (!cmsImageFileExtension(file.name)) {
        setError("Nama file gambar tidak valid.");
        return;
      }
      if (file.size > CMS_IMAGE_MAX_BYTES) {
        setError("Ukuran gambar melebihi batas 5 MB.");
        return;
      }
      releasePreview();
      setPendingFile(file);
      setPendingPreview(URL.createObjectURL(file));
    },
    [releasePreview],
  );

  const clearPending = useCallback((): void => {
    releasePreview();
    setPendingFile(null);
    setUploadPercent(null);
  }, [releasePreview]);

  const changeSource = useCallback(
    (next: CmsImageSelectionType): void => {
      if (busyRef.current) return;
      // Guard the third state at runtime too, not only in the option list.
      if (next === "none" && !allowNone) return;
      setSourceMode(next);
      setError(null);
      if (next === "external") {
        // Seed the URL field with the stored image so switching modes starts
        // from what is actually there, not from an empty box.
        setUrlValue((current) => (current.trim() ? current : (initial?.imageUrl ?? "")));
      }
    },
    [allowNone, initial?.imageUrl],
  );

  /**
   * Produces the exact image trio to persist, uploading first when the editor
   * picked a new file. Returns null when nothing should be saved (the error is
   * already set), so the form can abort without calling the API.
   */
  const resolveSubmission = useCallback(async (): Promise<CmsImageSubmission | null> => {
    if (sourceMode === "none") {
      // Deliberately empty: no placeholder URL is invented, and any ownership
      // metadata is dropped so cleanup can reclaim the previous object.
      return {
        imageUrl: "",
        imageSource: "none",
        blobPathname: null,
        uploadedPathname: null,
      };
    }

    if (sourceMode === "external") {
      const url = urlValue.trim();
      if (!url) {
        setError("URL gambar wajib diisi.");
        return null;
      }
      return {
        imageUrl: url,
        imageSource: "external",
        blobPathname: null,
        uploadedPathname: null,
      };
    }

    if (!pendingFile) {
      // No new selection: keep the stored image untouched.
      if (!initial?.imageUrl) {
        setError("Pilih gambar terlebih dahulu.");
        return null;
      }
      return {
        imageUrl: initial.imageUrl,
        imageSource: initial.source ?? "external",
        blobPathname: initial.blobPathname ?? null,
        uploadedPathname: null,
      };
    }

    const pathname = buildCmsBlobPathname(module, pendingFile.name);
    if (!pathname) {
      setError("Nama atau format file gambar tidak valid.");
      return null;
    }

    const file = pendingFile;
    setUploading(true);
    busyRef.current = true;
    setUploadPercent(0);
    try {
      const blob = await upload(pathname, file, {
        access: "public",
        contentType: file.type || cmsImageDefaultMimeType(file.name) || undefined,
        handleUploadUrl: CMS_UPLOAD_ENDPOINT,
        multipart: false,
        onUploadProgress: (event) => {
          const percentage = Number(event.percentage);
          if (Number.isFinite(percentage)) {
            setUploadPercent(Math.max(0, Math.min(100, Math.round(percentage))));
          }
        },
      });
      return {
        imageUrl: blob.url,
        imageSource: "upload",
        blobPathname: blob.pathname,
        uploadedPathname: blob.pathname,
      };
    } catch (uploadError) {
      // Keep the selected file so the editor can retry without re-picking it.
      setUploadPercent(null);
      setError(cmsImageUploadErrorMessage(uploadError));
      return null;
    } finally {
      setUploading(false);
      busyRef.current = false;
    }
  }, [initial, module, pendingFile, sourceMode, urlValue]);

  /**
   * Best-effort removal of an object uploaded by a submit whose metadata save
   * failed. Never throws: the save error is what the editor must see.
   */
  const cleanupOrphan = useCallback(async (submission: CmsImageSubmission): Promise<void> => {
    const pathname = submission.uploadedPathname;
    if (!pathname) return;
    try {
      const response = await fetch(CMS_CLEANUP_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathname }),
      });
      if (!response.ok) {
        console.warn("CMS image cleanup was refused", response.status);
      }
    } catch (cleanupError) {
      console.warn("CMS image cleanup failed", cleanupError);
    }
  }, []);

  // What the field should show: the pending file, else the stored upload, else
  // the typed URL. The "none" state shows nothing at all.
  const previewSrc =
    pendingPreview ??
    (sourceMode === "none"
      ? ""
      : sourceMode === "upload"
        ? (initial?.imageUrl ?? "")
        : urlValue.trim());

  const currentFileInfo =
    sourceMode === "none"
      ? null
      : pendingFile
        ? { name: pendingFile.name, bytes: pendingFile.size }
        : initial?.imageUrl
          ? {
              name: initial.blobPathname?.split("/").pop() ?? "Gambar tersimpan",
              bytes: null,
            }
          : null;

  return {
    sourceMode,
    changeSource,
    urlValue,
    setUrlValue,
    pendingFile,
    previewSrc,
    currentFileInfo,
    hasStoredImage: Boolean(initial?.imageUrl),
    storedSource: initial?.source ?? "external",
    uploading,
    uploadPercent,
    error,
    setError,
    selectFile,
    clearPending,
    resolveSubmission,
    cleanupOrphan,
  };
}
