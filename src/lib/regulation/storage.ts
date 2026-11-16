// Isolated storage policy for Standard & Regulation.
//
// This module is intentionally independent from Template Form: its module has
// a 20 MB limit and accepts ZIP, while Template Form keeps its existing 50 MB
// policy and formats. Nothing here mutates or imports that policy.

export const REGULATION_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export const REGULATION_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".zip",
] as const;

export const REGULATION_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
] as const;

// Browsers and older Office installs frequently report legacy .doc/.xls as
// octet-stream. The product also requires an octet-stream fallback for ZIP.
// Extension and stored metadata are still validated separately.
export const REGULATION_UPLOAD_ALLOWED_CONTENT_TYPES = [
  ...REGULATION_ALLOWED_MIME_TYPES,
  "application/octet-stream",
] as const;

const REGULATION_MIME_TYPES_BY_EXTENSION: Record<
  string,
  readonly string[]
> = {
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword", "application/octet-stream"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ".xls": ["application/vnd.ms-excel", "application/octet-stream"],
  ".xlsx": [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  ".zip": [
    "application/zip",
    "application/x-zip-compressed",
    "application/octet-stream",
  ],
};

export const REGULATION_ACCEPT_ATTRIBUTE =
  REGULATION_ALLOWED_EXTENSIONS.join(",");

export const REGULATION_BLOB_PREFIX = "regulation/";

const UUID_SEGMENT_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_FILE_SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;

export function normalizeMimeType(
  mimeType: string | null | undefined,
): string {
  if (typeof mimeType !== "string") return "";
  return mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function regulationFileExtension(fileName: string): string | null {
  const trimmed = fileName.trim().toLowerCase();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === trimmed.length - 1) {
    return null;
  }
  return trimmed.slice(lastDot);
}

export function isRegulationAllowedFileName(fileName: string): boolean {
  const extension = regulationFileExtension(fileName);
  return (
    extension !== null &&
    (REGULATION_ALLOWED_EXTENSIONS as readonly string[]).includes(extension)
  );
}

export function isRegulationMimeTypeAllowed(
  extension: string,
  mimeType: string | null | undefined,
): boolean {
  const normalizedExtension = extension.trim().toLowerCase();
  const allowed = REGULATION_MIME_TYPES_BY_EXTENSION[normalizedExtension];
  if (!allowed) return false;
  const normalized = normalizeMimeType(mimeType);
  return normalized.length > 0 && allowed.includes(normalized);
}

export function regulationDefaultMimeType(fileName: string): string | null {
  const extension = regulationFileExtension(fileName);
  if (!extension) return null;
  return REGULATION_MIME_TYPES_BY_EXTENSION[extension]?.[0] ?? null;
}

export function sanitizeRegulationStorageFileName(
  fileName: string,
): string | null {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const extension = regulationFileExtension(base);
  if (!extension || !isRegulationAllowedFileName(base)) {
    return null;
  }
  const stem = base
    .slice(0, base.length - extension.length)
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-._]+/, "")
    .replace(/[-._]+$/, "")
    .slice(0, 80);
  const safeStem = stem.length > 0 ? stem : "file";
  return `${safeStem}${extension}`;
}

export function isValidRegulationBlobPathname(pathname: string): boolean {
  if (typeof pathname !== "string") return false;
  if (pathname.length === 0 || pathname.length > 500) return false;
  if (!pathname.startsWith(REGULATION_BLOB_PREFIX)) return false;
  const segments = pathname.slice(REGULATION_BLOB_PREFIX.length).split("/");
  if (segments.length !== 2) return false;
  const [uuidSegment, fileSegment] = segments;
  if (!uuidSegment || !fileSegment) return false;
  if (!UUID_SEGMENT_RE.test(uuidSegment)) return false;
  if (!SAFE_FILE_SEGMENT_RE.test(fileSegment)) return false;
  if (fileSegment.includes("..")) return false;
  return isRegulationAllowedFileName(fileSegment);
}

export function buildRegulationBlobPathname(fileName: string): string | null {
  const safeFileName = sanitizeRegulationStorageFileName(fileName);
  if (!safeFileName) return null;
  return `${REGULATION_BLOB_PREFIX}${globalThis.crypto.randomUUID()}/${safeFileName}`;
}

export function regulationBlobPathnameExtension(
  pathname: string,
): string | null {
  const fileSegment = pathname.split("/").pop() ?? "";
  return regulationFileExtension(fileSegment);
}
