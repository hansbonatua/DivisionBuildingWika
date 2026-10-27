import {
  isTemplateFormAllowedFileName,
  templateFormFileExtension,
} from "@/lib/template-form/source";

// Template & Form storage identity (Phase 2).
//
// Layout: template-form/{upload-uuid}/{sanitized-file-name}
// - the UUID segment makes every upload collision-resistant and carries no
//   personal data (no NIP, email or person name);
// - the file segment is a sanitized storage name, never the raw upload name;
// - the client can never choose a path outside this namespace.
//
// Pure module (no Blob SDK import) so it is safe to validate in any layer.

export const TEMPLATE_FORM_BLOB_PREFIX = "template-form/";

const UUID_SEGMENT_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SAFE_FILE_SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;

/**
 * Deterministic storage-safe file name. Returns null when the name does not
 * carry an approved extension.
 *
 * Traversal attempts are neutralized by taking the last path segment and
 * dropping everything outside [A-Za-z0-9._-].
 */
export function sanitizeTemplateFormStorageFileName(
  fileName: string,
): string | null {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const extension = templateFormFileExtension(base);
  if (!extension || !isTemplateFormAllowedFileName(base)) {
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

/** True only for a well-formed pathname inside the Template & Form namespace. */
export function isValidTemplateFormBlobPathname(pathname: string): boolean {
  if (typeof pathname !== "string") return false;
  if (!pathname.startsWith(TEMPLATE_FORM_BLOB_PREFIX)) return false;
  const segments = pathname.slice(TEMPLATE_FORM_BLOB_PREFIX.length).split("/");
  if (segments.length !== 2) return false;
  const [uuidSegment, fileSegment] = segments;
  if (!uuidSegment || !fileSegment) return false;
  if (!UUID_SEGMENT_RE.test(uuidSegment)) return false;
  if (!SAFE_FILE_SEGMENT_RE.test(fileSegment)) return false;
  if (fileSegment.includes("..")) return false;
  return isTemplateFormAllowedFileName(fileSegment);
}

/**
 * Builds the pathname the server authorizes for a new upload.
 * Returns null when the display file name is not an approved document type.
 */
export function buildTemplateFormBlobPathname(
  fileName: string,
): string | null {
  const safeFileName = sanitizeTemplateFormStorageFileName(fileName);
  if (!safeFileName) return null;
  return `${TEMPLATE_FORM_BLOB_PREFIX}${globalThis.crypto.randomUUID()}/${safeFileName}`;
}

/** Lowercased extension of the storage file segment, or null. */
export function templateFormBlobPathnameExtension(
  pathname: string,
): string | null {
  const fileSegment = pathname.split("/").pop() ?? "";
  return templateFormFileExtension(fileSegment);
}

/**
 * Safe `Content-Disposition` value for a download. Always an attachment, with
 * an ASCII fallback plus RFC 5987 encoding so non-ASCII names survive.
 */
export function contentDispositionAttachment(fileName: string): string {
  const cleaned = fileName
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/["\\]/g, "")
    .trim();
  const safeName = cleaned.length > 0 ? cleaned : "template-form";
  const asciiFallback = safeName.replace(/[^\x20-\x7e]/g, "_") || "document";
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(
    safeName,
  )}`;
}
