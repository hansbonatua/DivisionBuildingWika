// Template & Form source model — single source of truth for the revised V1.
//
// A record has exactly ONE source: an external link or an uploaded document.
// Pure and dependency-free so both server code and Client Components can read
// the canonical values, labels and upload constraints.
//
// These constants are the single source of truth for the upload pipeline:
// the storage path helpers, the upload token route and the server-side
// metadata verification all read them (Phase 2).

export const TEMPLATE_FORM_SOURCE_TYPES = ["link", "upload"] as const;

export type TemplateFormSourceType = (typeof TEMPLATE_FORM_SOURCE_TYPES)[number];

export function isTemplateFormSourceType(
  value: unknown,
): value is TemplateFormSourceType {
  return (
    typeof value === "string" &&
    (TEMPLATE_FORM_SOURCE_TYPES as readonly string[]).includes(value)
  );
}

// UI labels for the "Sumber" selector.
export const TEMPLATE_FORM_SOURCE_LABELS: Record<
  TemplateFormSourceType,
  string
> = {
  link: "Link",
  upload: "Upload File",
};

// Approved upload constraints (enforced in Phase 2 at token/upload time).
export const TEMPLATE_FORM_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export const TEMPLATE_FORM_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
] as const;

export const TEMPLATE_FORM_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

// Browsers and older Office installs frequently report the legacy .doc/.xls/.ppt
// binaries as octet-stream, so the upload token accepts it. The extension and the
// stored metadata are still validated separately below.
export const TEMPLATE_FORM_UPLOAD_ALLOWED_CONTENT_TYPES = [
  ...TEMPLATE_FORM_ALLOWED_MIME_TYPES,
  "application/octet-stream",
] as const;

// Declared MIME types accepted per extension. The legacy Office fallbacks
// (empty or application/octet-stream) are deliberately narrow: modern OOXML
// formats must declare their real document type.
const TEMPLATE_FORM_MIME_TYPES_BY_EXTENSION: Record<
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
  ".ppt": ["application/vnd.ms-powerpoint", "application/octet-stream"],
  ".pptx": [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
};

const LEGACY_OFFICE_EXTENSIONS = [".doc", ".xls", ".ppt"];

export function normalizeMimeType(mimeType: string | null | undefined): string {
  if (typeof mimeType !== "string") return "";
  return mimeType.split(";")[0].trim().toLowerCase();
}

// True when a declared MIME type is acceptable for the given file extension.
export function isTemplateFormMimeTypeAllowed(
  extension: string,
  mimeType: string | null | undefined,
): boolean {
  const normalizedExtension = extension.trim().toLowerCase();
  const allowed = TEMPLATE_FORM_MIME_TYPES_BY_EXTENSION[normalizedExtension];
  if (!allowed) return false;
  const normalized = normalizeMimeType(mimeType);
  if (normalized === "") {
    return LEGACY_OFFICE_EXTENSIONS.includes(normalizedExtension);
  }
  return allowed.includes(normalized);
}

export const TEMPLATE_FORM_ACCEPT_ATTRIBUTE =
  TEMPLATE_FORM_ALLOWED_EXTENSIONS.join(",");

/**
 * Declared MIME type for an approved file name, derived from the same allowlist
 * used by server-side verification. Returns null when the name is not approved.
 *
 * The browser sometimes reports an empty `File.type`; the upload flow uses this
 * so the stored object still carries a document content type.
 */
export function templateFormDefaultMimeType(fileName: string): string | null {
  const extension = templateFormFileExtension(fileName);
  if (!extension) return null;
  const allowed = TEMPLATE_FORM_MIME_TYPES_BY_EXTENSION[extension];
  return allowed?.[0] ?? null;
}

// Lowercased final extension of a display filename, or null when absent.
export function templateFormFileExtension(fileName: string): string | null {
  const trimmed = fileName.trim().toLowerCase();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === trimmed.length - 1) {
    return null;
  }
  return trimmed.slice(lastDot);
}

export function isTemplateFormAllowedFileName(fileName: string): boolean {
  const extension = templateFormFileExtension(fileName);
  return (
    extension !== null &&
    (TEMPLATE_FORM_ALLOWED_EXTENSIONS as readonly string[]).includes(extension)
  );
}
