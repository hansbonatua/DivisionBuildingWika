// Pure helpers for the User Control profile-photo namespace.
//
// No Blob SDK import: the browser builds the pathname before it asks for an
// upload token, and the server parses the very same shape to prove ownership.
//
// Layout: user-photos/{userId}/{uploadUuid}/avatar-{safeName}.{ext}
// - the user-id segment lets the server prove an object belongs to the account
//   whose photo_url is being written;
// - the random segment keeps every upload immutable and collision-free;
// - no email, NIP or person name is ever embedded in the pathname.
//
// The namespace is deliberately separate from `cms/*` and `project-photos/*` so
// cleanup and ownership checks can never confuse a profile photo with landing
// content or SASAA project photos.

export const USER_PHOTO_NAMESPACE = "user-photos";
export const USER_PHOTO_PREFIX = `${USER_PHOTO_NAMESPACE}/`;

export const USER_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

// SVG is deliberately absent: it is an active-content format that MIME and
// extension checks alone cannot sanitize.
export const USER_PHOTO_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type UserPhotoContentType = (typeof USER_PHOTO_ALLOWED_TYPES)[number];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE_NAME_RE = /^avatar(-[a-z0-9-]{1,40})?\.(jpg|png|webp)$/;
// Legacy Vercel Blob public host. Kept ONLY so rows written before the MinIO
// migration still resolve to a pathname (ownership detection and cleanup).
const LEGACY_BLOB_HOST_RE = /(^|\.)public\.blob\.vercel-storage\.com$/i;

export type ParsedUserPhotoPath = {
  userId: string;
  uploadUuid: string;
  fileName: string;
};

/** Normalized content type, or "" when absent. */
function normalizeContentType(contentType: string): string {
  return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function isUserPhotoContentType(
  contentType: string,
): contentType is UserPhotoContentType {
  return (USER_PHOTO_ALLOWED_TYPES as readonly string[]).includes(
    normalizeContentType(contentType),
  );
}

/** Storage extension for an approved image file name, or null. */
export function userPhotoExtension(
  fileName: string,
): "jpg" | "png" | "webp" | null {
  const trimmed = fileName.trim().toLowerCase();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === trimmed.length - 1) {
    return null;
  }
  const extension = trimmed.slice(lastDot + 1);
  if (extension === "jpg" || extension === "jpeg") return "jpg";
  if (extension === "png") return "png";
  if (extension === "webp") return "webp";
  return null;
}

/**
 * Storage-safe stem: lowercased, every run of non-alphanumerics collapsed to
 * "-", capped at 40 characters. Returns null when nothing usable is left, so the
 * caller can fall back to the plain "avatar" base name.
 */
export function sanitizeUserPhotoName(fileName: string): string | null {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const lastDot = base.lastIndexOf(".");
  const stem = lastDot > 0 ? base.slice(0, lastDot) : "";
  const safe = stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return safe.length > 0 ? safe : null;
}

/**
 * The only pathname shape the upload token may authorize:
 * user-photos/{userId}/{randomUuid}/avatar-{safeName}.{ext}
 *
 * Returns null for an unknown user id, an unsupported extension, or a name that
 * sanitizes to nothing usable.
 */
export function buildUserPhotoPathname(
  userId: string,
  fileName: string,
): string | null {
  if (typeof userId !== "string" || !UUID_RE.test(userId)) {
    return null;
  }
  const extension = userPhotoExtension(fileName);
  if (!extension) {
    return null;
  }
  const safeName = sanitizeUserPhotoName(fileName);
  const baseName = safeName ? `avatar-${safeName}` : "avatar";
  return `${USER_PHOTO_PREFIX}${userId}/${globalThis.crypto.randomUUID()}/${baseName}.${extension}`;
}

/**
 * Parses and validates a profile-photo pathname. Returns null for every shape
 * that is not owned by this namespace, including extra segments and traversal.
 */
export function parseUserPhotoPathname(
  pathname: string,
): ParsedUserPhotoPath | null {
  if (typeof pathname !== "string" || !pathname.startsWith(USER_PHOTO_PREFIX)) {
    return null;
  }
  const segments = pathname.slice(USER_PHOTO_PREFIX.length).split("/");
  if (segments.length !== 3) {
    return null;
  }
  const [userId, uploadUuid, fileName] = segments;
  if (!userId || !uploadUuid || !fileName) {
    return null;
  }
  if (!UUID_RE.test(userId) || !UUID_RE.test(uploadUuid)) {
    return null;
  }
  if (!FILE_NAME_RE.test(fileName) || fileName.includes("..")) {
    return null;
  }
  return { userId, uploadUuid, fileName };
}

export function isUserPhotoPathnameFor(
  pathname: string,
  userId: string,
): boolean {
  const parsed = parseUserPhotoPathname(pathname);
  return parsed !== null && parsed.userId === userId;
}

/**
 * Base URL of the public bucket: `${S3_ENDPOINT_PUBLIC}/${S3_BUCKET_PUBLIC}`.
 *
 * Read lazily and never at module scope: this module is also imported by Client
 * Components (for the pure pathname helpers), where a server-only variable is
 * simply undefined and this function returns null.
 */
function publicBucketBaseUrl(): URL | null {
  const endpoint = process.env.S3_ENDPOINT_PUBLIC?.trim();
  const bucket = process.env.S3_BUCKET_PUBLIC?.trim();
  if (!endpoint || !bucket) return null;
  try {
    return new URL(`${endpoint.replace(/\/+$/, "")}/${bucket}`);
  } catch {
    return null;
  }
}

/**
 * Pathname behind a public object URL, or null when the URL does not address an
 * object in the public bucket (an external/legacy photo URL, a local /asset
 * path or an unparseable string).
 *
 * Two hosts are recognized on purpose:
 *   - the current public bucket (`S3_ENDPOINT_PUBLIC`/`S3_BUCKET_PUBLIC`);
 *   - the legacy Vercel Blob public host, so photos stored before the MinIO
 *     migration keep their ownership detection until they are re-uploaded.
 */
export function extractPathnameFromUrl(url: string): string | null {
  if (typeof url !== "string") {
    return null;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }

    const base = publicBucketBaseUrl();
    if (base && parsed.origin === base.origin) {
      const prefix = `${base.pathname.replace(/\/+$/, "")}/`;
      if (!parsed.pathname.startsWith(prefix)) {
        return null;
      }
      const pathname = decodeURIComponent(parsed.pathname.slice(prefix.length));
      return pathname.length > 0 ? pathname : null;
    }

    if (!LEGACY_BLOB_HOST_RE.test(parsed.hostname)) {
      return null;
    }
    const pathname = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    return pathname.length > 0 ? pathname : null;
  } catch {
    return null;
  }
}
