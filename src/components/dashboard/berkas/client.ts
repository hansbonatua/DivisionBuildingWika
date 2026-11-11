"use client";

import {
  buildBerkasUploadPathname,
  buildBerkasValidationTtdPathname,
  type BerkasValidationRole,
} from "@/lib/berkas/storage-path";

export const BERKAS_UPLOAD_TOKEN_URL = "/api/berkas/upload-token";
export const PDF_MAX_BYTES = 20 * 1024 * 1024;
export const TTD_MAX_BYTES = 2 * 1024 * 1024;
const PDFJS_WORKER_SRC = "/pdfjs/pdf.worker.min.mjs";
export const PDFJS_STANDARD_FONT_DATA_URL = "/pdfjs/standard_fonts/";

type PdfjsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfjsModule> | null = null;

export function loadPdfjs(): Promise<PdfjsModule> {
  pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
    return pdfjs;
  });
  return pdfjsPromise;
}

type ApiErrorBody = {
  error?: {
    message?: string;
    details?: Record<string, string[] | undefined>;
  };
};

function firstValidationDetail(
  details: Record<string, string[] | undefined> | undefined,
): string | null {
  if (!details) return null;
  for (const messages of Object.values(details)) {
    const message = messages?.find((value) => value.trim() !== "");
    if (message) return message;
  }
  return null;
}

export async function readApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    const detail = firstValidationDetail(body.error?.details);
    if (detail) return detail;
    if (body.error?.message?.trim()) return body.error.message;
  } catch {
    // A non-JSON error body is not useful; map by status below.
  }
  if (response.status === 401) return "Sesi Anda berakhir. Silakan masuk kembali.";
  if (response.status === 403) return "Anda tidak memiliki akses untuk tindakan ini.";
  if (response.status === 409) return "Status Berkas sudah berubah. Muat ulang data.";
  if (response.status === 413) return "Ukuran file melebihi batas.";
  return fallback;
}

export function imageFileExtension(file: File): "png" | "jpg" {
  const lowerName = file.name.toLowerCase();
  if (file.type === "image/png" || lowerName.endsWith(".png")) return "png";
  return "jpg";
}

function requireUploadPath(pathname: string | null): string {
  if (!pathname) {
    throw new Error("Nama file upload tidak valid.");
  }
  return pathname;
}

export function buildOriginalUploadPath(actorId: string, uploadId: string): string {
  return requireUploadPath(
    buildBerkasUploadPathname(
      actorId,
      uploadId,
      "original",
      `${crypto.randomUUID()}.pdf`,
    ),
  );
}

export function buildPenyusunTtdUploadPath(
  actorId: string,
  uploadId: string,
  file: File,
): string {
  return requireUploadPath(
    buildBerkasUploadPathname(
      actorId,
      uploadId,
      "penyusun_ttd",
      `${crypto.randomUUID()}.${imageFileExtension(file)}`,
      1,
    ),
  );
}

export function buildValidatorTtdUploadPath(
  berkasId: string,
  role: BerkasValidationRole,
  file: File,
): string {
  return requireUploadPath(
    buildBerkasValidationTtdPathname(
      berkasId,
      role,
      `${crypto.randomUUID()}.${imageFileExtension(file)}`,
    ),
  );
}

export async function getPdfPageCount(file: File): Promise<number> {
  const pdfjs = await loadPdfjs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    standardFontDataUrl: PDFJS_STANDARD_FONT_DATA_URL,
  });
  const document = await loadingTask.promise;
  try {
    return document.numPages;
  } finally {
    await loadingTask.destroy();
  }
}

function fileNameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.trim());
    } catch {
      return encoded.trim();
    }
  }
  const plain = header.match(/filename="?([^";]+)"?/i)?.[1];
  return plain?.trim() || null;
}

export async function downloadBerkasFile(
  id: string,
  fallbackName: string,
): Promise<void> {
  const response = await fetch(`/api/berkas/${id}/download`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "Gagal mengunduh Berkas."),
    );
  }
  const blob = await response.blob();
  const fileName =
    fileNameFromDisposition(response.headers.get("content-disposition")) ||
    `${fallbackName.replace(/\.pdf$/i, "")}.pdf`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
