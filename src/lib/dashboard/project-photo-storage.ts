import { isCmsImageAllowedFileName } from "@/lib/cms/image-source";
import { sanitizeCmsImageStorageFileName } from "@/lib/cms/storage-path";

// Public Blob namespace for SASAA project photos. The project id and slot are
// part of the path so the server can prove that an uploaded object belongs to
// the project being saved. The random upload segment prevents collisions and
// keeps the object immutable; no user data is embedded in the pathname.
export const PROJECT_PHOTO_PREFIX = "project-photos/";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLOT_FILE_RE = /^([1-4])-(.+)$/;

export type ProjectPhotoSlot = 1 | 2 | 3 | 4;

export type ParsedProjectPhotoPath = {
  projectId: string;
  slot: ProjectPhotoSlot;
  uploadId: string;
  fileName: string;
};

export function isProjectPhotoSlot(value: unknown): value is ProjectPhotoSlot {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

/**
 * Builds the only pathname shape the upload token may authorize:
 * project-photos/{projectId}/{randomUuid}/{slot}-{safeFileName}
 */
export function buildProjectPhotoPathname(
  projectId: string,
  slot: number,
  fileName: string,
): string | null {
  if (!UUID_RE.test(projectId) || !isProjectPhotoSlot(slot)) {
    return null;
  }
  const safeFileName = sanitizeCmsImageStorageFileName(fileName);
  if (!safeFileName) {
    return null;
  }
  return `${PROJECT_PHOTO_PREFIX}${projectId}/${globalThis.crypto.randomUUID()}/${slot}-${safeFileName}`;
}

/**
 * Parses and validates a project-photo pathname. Returns null for every shape
 * that is not owned by this namespace, including extra segments and traversal.
 */
export function parseProjectPhotoPathname(
  pathname: string,
): ParsedProjectPhotoPath | null {
  if (typeof pathname !== "string" || !pathname.startsWith(PROJECT_PHOTO_PREFIX)) {
    return null;
  }
  const segments = pathname.slice(PROJECT_PHOTO_PREFIX.length).split("/");
  if (segments.length !== 3) {
    return null;
  }
  const [projectId, uploadId, fileSegment] = segments;
  if (!projectId || !uploadId || !fileSegment) {
    return null;
  }
  if (!UUID_RE.test(projectId) || !UUID_RE.test(uploadId)) {
    return null;
  }
  const match = SLOT_FILE_RE.exec(fileSegment);
  if (!match) {
    return null;
  }
  const slot = Number(match[1]);
  const fileName = match[2] ?? "";
  if (!isProjectPhotoSlot(slot) || fileName.includes("..")) {
    return null;
  }
  if (!isCmsImageAllowedFileName(fileName)) {
    return null;
  }
  return { projectId, slot, uploadId, fileName };
}

export function isProjectPhotoPathnameFor(
  pathname: string,
  projectId: string,
  slot: number,
): boolean {
  const parsed = parseProjectPhotoPathname(pathname);
  return parsed !== null && parsed.projectId === projectId && parsed.slot === slot;
}
