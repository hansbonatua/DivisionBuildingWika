import {
  cmsImageFileExtension,
  isCmsImageAllowedFileName,
} from "@/lib/cms/image-source";

// CMS public-image storage identity.
//
// Layout: cms/{module}/{upload-uuid}/{sanitized-file-name}
// - the module segment keeps landing images in per-surface namespaces;
// - the UUID segment makes every upload collision-resistant and carries no
//   personal data (no NIP, email or person name);
// - the file segment is a sanitized storage name, never the raw upload name;
// - the client can never choose a path outside this namespace.
//
// AUTHORIZED upload namespaces: hero (Phase A), projects + green-building
// (Phase B), clients (Phase C), social (Phase D) and organization (Struktur
// Organisasi). Any other `cms/*` path stays rejected, and the PRIVATE
// Template & Form namespace (`template-form/*`) is never part of this module.
//
// Pure module (no Blob SDK import) so it is safe to validate in any layer,
// including the browser, before a token is requested.

export const CMS_STORAGE_PREFIX = "cms/";

export const CMS_HERO_PREFIX = "cms/hero/";

export const CMS_PROJECTS_PREFIX = "cms/projects/";
export const CMS_GREEN_BUILDING_PREFIX = "cms/green-building/";
export const CMS_CLIENTS_PREFIX = "cms/clients/";
export const CMS_SOCIAL_PREFIX = "cms/social/";

// Struktur Organisasi: exactly one organization chart, not landing content. It
// lives in the same PUBLIC store because the dashboard viewer renders the image
// directly; a private object would need a second download proxy. No public
// landing route reads this namespace — only the authenticated dashboard does.
export const CMS_ORGANIZATION_PREFIX = "cms/organization/";

// Modules that may create uploads today.
export const CMS_UPLOAD_MODULES = [
  "hero",
  "projects",
  "green-building",
  "clients",
  "social",
  "organization",
] as const;

export type CmsUploadModule = (typeof CMS_UPLOAD_MODULES)[number];

export const CMS_UPLOAD_PREFIX_BY_MODULE: Record<CmsUploadModule, string> = {
  hero: CMS_HERO_PREFIX,
  projects: CMS_PROJECTS_PREFIX,
  "green-building": CMS_GREEN_BUILDING_PREFIX,
  clients: CMS_CLIENTS_PREFIX,
  social: CMS_SOCIAL_PREFIX,
  organization: CMS_ORGANIZATION_PREFIX,
};

const UUID_SEGMENT_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SAFE_FILE_SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;

/**
 * Deterministic storage-safe image file name. Returns null when the name does
 * not carry an approved image extension.
 *
 * Traversal attempts are neutralized by taking the last path segment and
 * dropping everything outside [A-Za-z0-9._-].
 */
export function sanitizeCmsImageStorageFileName(fileName: string): string | null {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const extension = cmsImageFileExtension(base);
  if (!extension || !isCmsImageAllowedFileName(base)) {
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
  const safeStem = stem.length > 0 ? stem : "image";
  return `${safeStem}${extension}`;
}

/**
 * Builds the pathname the server authorizes for a new upload in `module`'s
 * namespace. Returns null when the display file name is not an approved image
 * type, so an unsupported format can never reach the token route.
 */
export function buildCmsBlobPathname(
  module: CmsUploadModule,
  fileName: string,
): string | null {
  const safeFileName = sanitizeCmsImageStorageFileName(fileName);
  if (!safeFileName) return null;
  return `${CMS_UPLOAD_PREFIX_BY_MODULE[module]}${globalThis.crypto.randomUUID()}/${safeFileName}`;
}

function splitSegments(pathname: string, prefix: string): string[] | null {
  if (typeof pathname !== "string") return null;
  if (!pathname.startsWith(prefix)) return null;
  const segments = pathname.slice(prefix.length).split("/");
  if (segments.length !== 2) return null;
  const [uuidSegment, fileSegment] = segments;
  if (!uuidSegment || !fileSegment) return null;
  if (!UUID_SEGMENT_RE.test(uuidSegment)) return null;
  if (!SAFE_FILE_SEGMENT_RE.test(fileSegment)) return null;
  if (fileSegment.includes("..")) return null;
  if (!isCmsImageAllowedFileName(fileSegment)) return null;
  return [uuidSegment, fileSegment];
}

/** True only for a well-formed pathname inside the Hero namespace. */
export function isCmsHeroBlobPathname(pathname: string): boolean {
  return splitSegments(pathname, CMS_HERO_PREFIX) !== null;
}

/** True only for a well-formed pathname inside the Portfolio namespace. */
export function isCmsProjectsBlobPathname(pathname: string): boolean {
  return splitSegments(pathname, CMS_PROJECTS_PREFIX) !== null;
}

/** True only for a well-formed pathname inside the Green Building namespace. */
export function isCmsGreenBuildingBlobPathname(pathname: string): boolean {
  return splitSegments(pathname, CMS_GREEN_BUILDING_PREFIX) !== null;
}

/** True only for a well-formed pathname inside the Clients namespace. */
export function isCmsClientsBlobPathname(pathname: string): boolean {
  return splitSegments(pathname, CMS_CLIENTS_PREFIX) !== null;
}

/** True only for a well-formed pathname inside the Social Media namespace. */
export function isCmsSocialBlobPathname(pathname: string): boolean {
  return splitSegments(pathname, CMS_SOCIAL_PREFIX) !== null;
}

/** True only for a well-formed pathname inside the Struktur Organisasi namespace. */
export function isCmsOrganizationBlobPathname(pathname: string): boolean {
  return splitSegments(pathname, CMS_ORGANIZATION_PREFIX) !== null;
}

/**
 * True only for a pathname the upload route may mint a token for.
 *
 * This is the authorization set, kept separate from isCmsBlobPathname(): the
 * parser recognizes every declared namespace (so cleanup/ownership logic does
 * not need rewriting per phase), while uploads stay restricted to the modules
 * that actually ship an uploader.
 */
export function isCmsUploadPathname(pathname: string): boolean {
  return (
    isCmsHeroBlobPathname(pathname) ||
    isCmsProjectsBlobPathname(pathname) ||
    isCmsGreenBuildingBlobPathname(pathname) ||
    isCmsClientsBlobPathname(pathname) ||
    isCmsSocialBlobPathname(pathname) ||
    isCmsOrganizationBlobPathname(pathname)
  );
}

/**
 * True for a well-formed pathname inside ANY declared CMS namespace.
 *
 * Ownership + cleanup accept every namespace so an object is recognized as
 * CMS-owned regardless of which module created it.
 */
export function isCmsBlobPathname(pathname: string): boolean {
  if (typeof pathname !== "string") return false;
  if (!pathname.startsWith(CMS_STORAGE_PREFIX)) return false;
  if (isCmsHeroBlobPathname(pathname)) return true;
  return (
    splitSegments(pathname, CMS_PROJECTS_PREFIX) !== null ||
    splitSegments(pathname, CMS_GREEN_BUILDING_PREFIX) !== null ||
    splitSegments(pathname, CMS_CLIENTS_PREFIX) !== null ||
    isCmsSocialBlobPathname(pathname) ||
    isCmsOrganizationBlobPathname(pathname)
  );
}

/** Lowercased extension of the file segment, or null. */
export function cmsBlobPathnameExtension(pathname: string): string | null {
  const fileSegment = pathname.split("/").pop() ?? "";
  return cmsImageFileExtension(fileSegment);
}

/**
 * True when a stored public URL addresses exactly this pathname.
 *
 * Used for ownership detection: the URL is only treated as CMS-owned when its
 * path is the internal pathname we recorded, so a hot-linked third-party URL
 * can never be mistaken for an object we are allowed to delete. Host-agnostic
 * so a store move or custom domain does not break detection.
 */
export function matchesCmsBlobPathnameUrl(
  url: string,
  pathname: string,
): boolean {
  if (typeof url !== "string" || typeof pathname !== "string") return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    return parsed.pathname.replace(/^\/+/, "") === pathname;
  } catch {
    return false;
  }
}
