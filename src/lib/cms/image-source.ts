// CMS landing image source model — single source of truth for the public-image
// revision.
//
// A CMS record stores its image in ONE of two ways:
//   - "upload"   : an object in the PUBLIC Blob store (bdwika-cms)
//   - "external" : any URL or local /asset path the editor typed
//
// Pure and dependency-free so both server code and Client Components can read
// the canonical values, labels and upload constraints. The upload token route,
// the storage path helpers and the server-side metadata verification all read
// these constants, so the allowlist can never drift from the enforcement.
//
// SVG is deliberately absent: it is an active-content format and cannot be
// sanitized by MIME/extension checks alone. Existing SVG URLs keep rendering.

export const CMS_IMAGE_SOURCE_TYPES = ["upload", "external"] as const;

export type CmsImageSourceType = (typeof CMS_IMAGE_SOURCE_TYPES)[number];

export function isCmsImageSourceType(
  value: unknown,
): value is CmsImageSourceType {
  return (
    typeof value === "string" &&
    (CMS_IMAGE_SOURCE_TYPES as readonly string[]).includes(value)
  );
}

// Social Media is the only CMS surface where an image is OPTIONAL, so it adds a
// third state: "none" — publish the card without an image and let the landing
// render its Instagram glyph fallback.
//
// Deliberately a SEPARATE constant: the two-source enum above stays the Zod
// allowlist for Hero, Portfolio, Green Building and Clients, so none of those
// modules can silently start accepting "none" (which has no upload/external
// semantics and would flow into resolveCmsImageForWrite).
export const CMS_SOCIAL_IMAGE_SOURCE_TYPES = [
  "upload",
  "external",
  "none",
] as const;

export type CmsImageSelectionType =
  (typeof CMS_SOCIAL_IMAGE_SOURCE_TYPES)[number];

export function isCmsImageSelectionType(
  value: unknown,
): value is CmsImageSelectionType {
  return (
    typeof value === "string" &&
    (CMS_SOCIAL_IMAGE_SOURCE_TYPES as readonly string[]).includes(value)
  );
}

// UI labels for the "Sumber Gambar" selector.
export const CMS_IMAGE_SOURCE_LABELS: Record<CmsImageSourceType, string> = {
  upload: "Upload Gambar",
  external: "URL Gambar",
};

// Three-state labels for the Social Media selector ("Tanpa Gambar" is the
// curated-feed state that publishes a card without any image).
export const CMS_SOCIAL_IMAGE_SOURCE_LABELS: Record<
  CmsImageSelectionType,
  string
> = {
  upload: "Upload Gambar",
  external: "URL Gambar",
  none: "Tanpa Gambar",
};

// Clients show a logo, not a photo/screenshot, so the same two sources get
// logo-specific wording. Same underlying model — only the labels differ.
export const CMS_LOGO_SOURCE_LABELS: Record<CmsImageSourceType, string> = {
  upload: "Upload Logo",
  external: "URL Logo",
};

export const CMS_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const CMS_IMAGE_ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
] as const;

// Declared MIME types accepted per extension. Browsers occasionally report an
// empty type for a file, which the upload flow then fills from this map.
const CMS_IMAGE_MIME_TYPES_BY_EXTENSION: Record<string, readonly string[]> = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".avif": ["image/avif"],
};

export const CMS_IMAGE_UPLOAD_ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const CMS_IMAGE_ACCEPT_ATTRIBUTE = CMS_IMAGE_ALLOWED_EXTENSIONS.join(",");

// Uploaded objects get a fresh random pathname on every upload, so the bytes
// behind a URL never change. That makes an aggressive immutable cache safe and
// removes the need for any invalidation when an image is replaced.
export const CMS_IMAGE_CACHE_CONTROL_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

// Per-module guidance: one authoritative string each, replacing the
// conflicting dimension hints that used to live in the old forms. Guidance
// only — no hard pixel validation.
export const CMS_HERO_IMAGE_GUIDANCE =
  "Rekomendasi 1920 × 1080 px (16:9), maksimal 5 MB.";

export const CMS_PROJECT_IMAGE_GUIDANCE =
  "Rekomendasi 1600 × 900 px (16:9), maksimal 5 MB.";

export const CMS_GREEN_BUILDING_IMAGE_GUIDANCE =
  "Rekomendasi 1600 × 1000 px (16:10), maksimal 5 MB.";

// Logos are rendered object-contain (never cropped), so the recommendation is
// about legibility at card size plus transparent-background support.
export const CMS_CLIENT_LOGO_GUIDANCE =
  "Rekomendasi 400 × 160 px, gunakan PNG/WEBP transparan jika diperlukan, maksimal 5 MB.";

// Instagram posts are square on the landing grid. Guidance only — the landing
// crops with object-cover, so no hard pixel validation is applied.
export const CMS_SOCIAL_IMAGE_GUIDANCE =
  "Rekomendasi 1080 × 1080 px (1:1), maksimal 5 MB.";

// Compact format/size hint shared by every CMS image field.
export const CMS_IMAGE_FORMAT_HINT = "JPG, PNG, WEBP, AVIF • Maks. 5 MB";

export function normalizeCmsImageMimeType(
  mimeType: string | null | undefined,
): string {
  if (typeof mimeType !== "string") return "";
  return mimeType.split(";")[0].trim().toLowerCase();
}

// Lowercased final extension of a file name, or null when absent.
export function cmsImageFileExtension(fileName: string): string | null {
  const trimmed = fileName.trim().toLowerCase();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === trimmed.length - 1) {
    return null;
  }
  return trimmed.slice(lastDot);
}

export function isCmsImageAllowedFileName(fileName: string): boolean {
  const extension = cmsImageFileExtension(fileName);
  return (
    extension !== null &&
    (CMS_IMAGE_ALLOWED_EXTENSIONS as readonly string[]).includes(extension)
  );
}

// True when a declared MIME type is acceptable for the given extension. An empty
// declared type is accepted only because the storage path already pinned the
// extension and the token constrained the content type set.
export function isCmsImageMimeTypeAllowed(
  extension: string,
  mimeType: string | null | undefined,
): boolean {
  const allowed = CMS_IMAGE_MIME_TYPES_BY_EXTENSION[extension.trim().toLowerCase()];
  if (!allowed) return false;
  const normalized = normalizeCmsImageMimeType(mimeType);
  if (normalized === "") return true;
  return allowed.includes(normalized);
}

/** Content type stored for an approved image file name, or null. */
export function cmsImageDefaultMimeType(fileName: string): string | null {
  const extension = cmsImageFileExtension(fileName);
  if (!extension) return null;
  return CMS_IMAGE_MIME_TYPES_BY_EXTENSION[extension]?.[0] ?? null;
}

/** True when a stored object's content type is an accepted image type. */
export function isCmsImageContentType(contentType: string | null | undefined): boolean {
  return (CMS_IMAGE_UPLOAD_ALLOWED_CONTENT_TYPES as readonly string[]).includes(
    normalizeCmsImageMimeType(contentType),
  );
}

/** Human-readable size for progress/preview UI. */
export function formatCmsImageSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
