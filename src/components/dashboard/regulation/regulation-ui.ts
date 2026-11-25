import { uploadFile } from "@/lib/storage/upload-client";
import type { RegulationDisiplinKey } from "@/lib/regulation/constants";
import {
  REGULATION_MAX_FILE_SIZE_BYTES,
  buildRegulationBlobPathname,
  normalizeMimeType,
  regulationDefaultMimeType,
  regulationFileExtension,
} from "@/lib/regulation/storage";

// Client-only helpers for Standard & Regulation. The module is intentionally
// separate from Template Form and Metode Kerja Standar so their upload policies
// and UI behaviour cannot leak into this module.

export const REGULATION_DISIPLIN_DESCRIPTIONS: Record<
  RegulationDisiplinKey,
  string
> = {
  prosedur_wika:
    "Prosedur, instruksi kerja, dan panduan internal WIKA yang menjadi acuan pelaksanaan pekerjaan.",
  sni: "Standar Nasional Indonesia yang relevan untuk perencanaan, pelaksanaan, dan pengawasan pekerjaan.",
  peraturan_pemerintah:
    "Peraturan pemerintah, peraturan menteri, dan ketentuan regulatif lain yang wajib dipatuhi.",
  standar_internasional:
    "Standard, code, dan pedoman internasional yang digunakan sebagai referensi teknis perusahaan.",
  lainnya:
    "Referensi standar dan regulasi lain yang tidak termasuk dalam empat disiplin utama.",
};

const API_FALLBACK_401 = "Sesi Anda berakhir. Silakan masuk kembali.";
const API_FALLBACK_403 =
  "Anda tidak memiliki akses untuk mengubah Standard & Regulation.";

export type RegulationApiErrorBody = {
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

export async function readRegulationApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as RegulationApiErrorBody;
    const detail = firstValidationDetail(body.error?.details);
    if (detail) return detail;
    if (body.error?.message && body.error.message.trim() !== "") {
      return body.error.message;
    }
  } catch {
    /* non-JSON error body */
  }
  if (response.status === 401) return API_FALLBACK_401;
  if (response.status === 403) return API_FALLBACK_403;
  if (response.status === 404) {
    return "Data tidak ditemukan. Muat ulang halaman.";
  }
  if (response.status === 409) {
    return "Data berubah di tempat lain. Muat ulang lalu coba lagi.";
  }
  if (response.status === 503) {
    return "Layanan penyimpanan file belum dikonfigurasi.";
  }
  return fallback;
}

export function resolveRegulationMimeType(file: File): string {
  const fallback =
    regulationDefaultMimeType(file.name) ?? "application/octet-stream";
  const declared = normalizeMimeType(file.type);
  // Browsers frequently report OOXML as octet-stream. Sending the canonical
  // MIME for the extension avoids a token/upload that the server verifier must
  // reject after the bytes have already been transferred.
  return !declared || declared === "application/octet-stream"
    ? fallback
    : declared;
}

export async function uploadRegulationFile(
  file: File,
  onProgress: (percentage: number) => void,
): Promise<string> {
  const pathname = buildRegulationBlobPathname(file.name);
  if (!pathname) {
    throw new Error("INVALID_FILE_NAME");
  }

  const blob = await uploadFile(file, "/api/regulation/upload", {
    pathname,
    contentType: resolveRegulationMimeType(file),
    onProgress: (percentage) => {
      onProgress(Math.max(0, Math.min(100, Math.round(percentage))));
    },
  });

  return blob.pathname;
}

export async function cleanupRegulationOrphan(pathname: string): Promise<void> {
  try {
    const response = await fetch("/api/regulation/upload/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathname }),
    });
    if (!response.ok) {
      console.warn(
        "Standard & Regulation: orphan upload cleanup was refused",
        response.status,
      );
    }
  } catch (error) {
    console.warn("Standard & Regulation: orphan upload cleanup failed", error);
  }
}

function oneDecimal(value: number): string {
  const fixed = value.toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

export function formatRegulationFileSize(
  bytes: number | null | undefined,
): string {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) {
    return "—";
  }
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${kilobytes < 10 ? oneDecimal(kilobytes) : Math.round(kilobytes)} KB`;
  }
  const megabytes = kilobytes / 1024;
  return `${megabytes < 100 ? oneDecimal(megabytes) : Math.round(megabytes)} MB`;
}

export function regulationFileTypeLabel(fileName: string): string {
  const extension = regulationFileExtension(fileName);
  return extension ? extension.slice(1).toUpperCase() : "FILE";
}

export const REGULATION_MAX_FILE_SIZE_LABEL = `${Math.round(
  REGULATION_MAX_FILE_SIZE_BYTES / (1024 * 1024),
)} MB`;
