// Storage policy for Building Learning Center.
//
// BLC uses TWO separate Blob stores, and the namespace is what keeps them
// apart:
//   - thumbnails : PUBLIC store,  cms/learning/{upload-uuid}/{file}
//   - attachments: PRIVATE store, learning/{upload-uuid}/{file}
//
// The thumbnail lives under the CMS public namespace because it is rendered
// directly by the card grid (CDN-cached, no per-request proxy). Attachments are
// private because the module is open to every signed-in role, not to the public
// internet: a public Blob URL is permanent and cannot be revoked.
//
// Pure module (no Blob SDK import) so the browser can build/validate a pathname
// before requesting an upload token, and the token route can re-validate it.

import { LEARNING_URL_MAX_LENGTH } from "@/lib/learning/constants";

export const LEARNING_THUMBNAIL_PREFIX = "cms/learning/";
export const LEARNING_ATTACHMENT_PREFIX = "learning/";

export const LEARNING_THUMBNAIL_MAX_BYTES = 5 * 1024 * 1024;
export const LEARNING_ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;

export const LEARNING_THUMBNAIL_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

export const LEARNING_THUMBNAIL_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const LEARNING_ATTACHMENT_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".zip",
] as const;

const THUMBNAIL_MIME_TYPES_BY_EXTENSION: Record<string, readonly string[]> = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
};

const ATTACHMENT_MIME_TYPES_BY_EXTENSION: Record<string, readonly string[]> = {
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword", "application/octet-stream"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ".xls": ["application/vnd.ms-excel", "application/octet-stream"],
  ".xlsx": [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  ".ppt": ["application/vnd.ms-powerpoint", "application/octet-stream"],
  ".pptx": [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  ".zip": ["application/zip", "application/x-zip-compressed"],
};

// Browser upload allowlist. Legacy Office formats are frequently reported as
// octet-stream, and ZIP has no universally agreed type, so the token accepts it
// and the stored metadata is verified again per extension in the service.
export const LEARNING_ATTACHMENT_CONTENT_TYPES = [
  ...new Set(
    Object.values(ATTACHMENT_MIME_TYPES_BY_EXTENSION).flatMap((types) => [
      ...types,
    ]),
  ),
] as const;

const UUID_SEGMENT_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_FILE_SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;

export function normalizeMimeType(
  mimeType: string | null | undefined,
): string {
  if (typeof mimeType !== "string") return "";
  return mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function learningFileExtension(fileName: string): string | null {
  const trimmed = fileName.trim().toLowerCase();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === trimmed.length - 1) return null;
  return trimmed.slice(lastDot);
}

export function isLearningThumbnailFileName(fileName: string): boolean {
  const extension = learningFileExtension(fileName);
  return (
    extension !== null &&
    (LEARNING_THUMBNAIL_EXTENSIONS as readonly string[]).includes(extension)
  );
}

export function isLearningAttachmentFileName(fileName: string): boolean {
  const extension = learningFileExtension(fileName);
  return (
    extension !== null &&
    (LEARNING_ATTACHMENT_EXTENSIONS as readonly string[]).includes(extension)
  );
}

export function isLearningThumbnailMimeTypeAllowed(
  extension: string,
  mimeType: string | null | undefined,
): boolean {
  const allowed =
    THUMBNAIL_MIME_TYPES_BY_EXTENSION[extension.trim().toLowerCase()];
  if (!allowed) return false;
  const normalized = normalizeMimeType(mimeType);
  return normalized.length > 0 && allowed.includes(normalized);
}

export function isLearningAttachmentMimeTypeAllowed(
  extension: string,
  mimeType: string | null | undefined,
): boolean {
  const allowed = ATTACHMENT_MIME_TYPES_BY_EXTENSION[extension.trim().toLowerCase()];
  if (!allowed) return false;
  const normalized = normalizeMimeType(mimeType);
  return normalized.length > 0 && allowed.includes(normalized);
}

export function learningAttachmentDefaultMimeType(
  fileName: string,
): string | null {
  const extension = learningFileExtension(fileName);
  if (!extension) return null;
  return ATTACHMENT_MIME_TYPES_BY_EXTENSION[extension]?.[0] ?? null;
}

/**
 * Deterministic storage-safe file name. Traversal attempts are neutralised by
 * taking the last path segment and dropping everything outside
 * [A-Za-z0-9._-]; the display name stays in the database.
 */
function sanitizeStorageFileName(
  fileName: string,
  isAllowed: (name: string) => boolean,
  fallbackStem: string,
): string | null {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const extension = learningFileExtension(base);
  if (!extension || !isAllowed(base)) return null;

  const stem = base
    .slice(0, base.length - extension.length)
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-._]+/, "")
    .replace(/[-._]+$/, "")
    .slice(0, 80);

  const safeStem = stem.length > 0 ? stem : fallbackStem;
  return `${safeStem}${extension}`;
}

export function sanitizeLearningThumbnailFileName(
  fileName: string,
): string | null {
  return sanitizeStorageFileName(
    fileName,
    isLearningThumbnailFileName,
    "thumbnail",
  );
}

export function sanitizeLearningAttachmentFileName(
  fileName: string,
): string | null {
  return sanitizeStorageFileName(
    fileName,
    isLearningAttachmentFileName,
    "file",
  );
}

function splitPathname(pathname: string, prefix: string): string[] | null {
  if (typeof pathname !== "string") return null;
  if (pathname.length === 0 || pathname.length > 500) return null;
  if (!pathname.startsWith(prefix)) return null;

  const segments = pathname.slice(prefix.length).split("/");
  if (segments.length !== 2) return null;

  const [uuidSegment, fileSegment] = segments;
  if (!uuidSegment || !fileSegment) return null;
  if (!UUID_SEGMENT_RE.test(uuidSegment)) return null;
  if (!SAFE_FILE_SEGMENT_RE.test(fileSegment)) return null;
  if (fileSegment.includes("..")) return null;
  return [uuidSegment, fileSegment];
}

/** True only for `cms/learning/{uuid}/{safe-file}` with an image extension. */
export function isValidLearningThumbnailPathname(pathname: string): boolean {
  const segments = splitPathname(pathname, LEARNING_THUMBNAIL_PREFIX);
  if (!segments) return false;
  return isLearningThumbnailFileName(segments[1] ?? "");
}

/** True only for `learning/{uuid}/{safe-file}` with an allowed extension. */
export function isValidLearningAttachmentPathname(pathname: string): boolean {
  const segments = splitPathname(pathname, LEARNING_ATTACHMENT_PREFIX);
  if (!segments) return false;
  return isLearningAttachmentFileName(segments[1] ?? "");
}

export function buildLearningThumbnailPathname(fileName: string): string | null {
  const safeFileName = sanitizeLearningThumbnailFileName(fileName);
  if (!safeFileName) return null;
  return `${LEARNING_THUMBNAIL_PREFIX}${globalThis.crypto.randomUUID()}/${safeFileName}`;
}

export function buildLearningAttachmentPathname(
  fileName: string,
): string | null {
  const safeFileName = sanitizeLearningAttachmentFileName(fileName);
  if (!safeFileName) return null;
  return `${LEARNING_ATTACHMENT_PREFIX}${globalThis.crypto.randomUUID()}/${safeFileName}`;
}

export function learningBlobPathnameExtension(
  pathname: string,
): string | null {
  const fileSegment = pathname.split("/").pop() ?? "";
  return learningFileExtension(fileSegment);
}

/** Guard for user-supplied external links (training/certificate). */
export function normalizeExternalUrl(input: string): string | null {
  const value = input.trim();
  if (value.length === 0 || value.length > LEARNING_URL_MAX_LENGTH) return null;
  if (/\s/.test(value)) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  return value;
}
