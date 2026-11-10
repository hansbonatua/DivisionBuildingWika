// Pure storage-identity helpers for Berkas.
//
// Layout:
//   berkas/uploads/{actorId}/{uploadId}/original/{file}.pdf
//   berkas/uploads/{actorId}/{uploadId}/penyusun/{urutan}/{file}.png|jpg
//   berkas/{berkasId}/validasi/{1|2}/{file}.png|jpg
//   berkas/{berkasId}/generated/{file}.pdf
//
// The browser may propose a pathname during a client upload, but the server
// validates every segment before issuing a token or accepting metadata. No
// pathname is ever returned as a public URL.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SAFE_FILE_SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;
const PDF_FILE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.pdf$/i;
const IMAGE_FILE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(png|jpe?g)$/i;

export const BERKAS_UPLOAD_PREFIX = "berkas/uploads/";

export const BERKAS_UPLOAD_KINDS = ["original", "penyusun_ttd"] as const;
export type BerkasUploadKind = (typeof BERKAS_UPLOAD_KINDS)[number];

export const BERKAS_VALIDATION_ROLES = ["validasi-1", "validasi-2"] as const;
export type BerkasValidationRole = (typeof BERKAS_VALIDATION_ROLES)[number];

export type BerkasUploadPath = {
  actorId: string;
  uploadId: string;
  kind: BerkasUploadKind;
  urutan: number | null;
  fileName: string;
};

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function isSafePdfFile(fileName: string): boolean {
  return SAFE_FILE_SEGMENT_RE.test(fileName) && PDF_FILE_RE.test(fileName);
}

function isSafeImageFile(fileName: string): boolean {
  return SAFE_FILE_SEGMENT_RE.test(fileName) && IMAGE_FILE_RE.test(fileName);
}

function isBerkasUploadKind(value: string): value is BerkasUploadKind {
  return (BERKAS_UPLOAD_KINDS as readonly string[]).includes(value);
}

/** Parses a structurally valid create/upload pathname, without actor binding. */
export function parseBerkasUploadPathname(
  pathname: string,
): BerkasUploadPath | null {
  if (typeof pathname !== "string" || !pathname.startsWith(BERKAS_UPLOAD_PREFIX)) {
    return null;
  }

  const segments = pathname.slice(BERKAS_UPLOAD_PREFIX.length).split("/");
  const [actorId, uploadId, kindSegment, urutanSegment, fileNameSegment] = segments;
  if (!actorId || !uploadId || !kindSegment || !isUuid(actorId) || !isUuid(uploadId)) {
    return null;
  }

  if (kindSegment === "original") {
    if (segments.length !== 4) return null;
    const fileName = urutanSegment;
    if (!fileName || !isSafePdfFile(fileName)) return null;
    return {
      actorId,
      uploadId,
      kind: "original",
      urutan: null,
      fileName,
    };
  }

  if (kindSegment === "penyusun") {
    if (segments.length !== 5) return null;
    const urutan = Number(urutanSegment);
    const fileName = fileNameSegment;
    if (!Number.isInteger(urutan) || urutan < 1 || urutan > 4) return null;
    if (!fileName || !isSafeImageFile(fileName)) return null;
    return {
      actorId,
      uploadId,
      kind: "penyusun_ttd",
      urutan,
      fileName,
    };
  }

  return null;
}

/** Structural check used by Zod; actor/upload binding is checked in the service. */
export function isBerkasUploadPathname(pathname: string): boolean {
  return parseBerkasUploadPathname(pathname) !== null;
}

/** Exact actor + batch + kind check used before issuing a token or inserting. */
export function isValidBerkasUploadPathname(
  pathname: string,
  actorId: string,
  uploadId: string,
  kind: BerkasUploadKind,
  urutan?: number,
): boolean {
  const parsed = parseBerkasUploadPathname(pathname);
  if (!parsed) return false;
  if (parsed.actorId !== actorId || parsed.uploadId !== uploadId) return false;
  if (parsed.kind !== kind) return false;
  if (kind === "penyusun_ttd") {
    return parsed.urutan !== null && parsed.urutan === urutan;
  }
  return parsed.urutan === null;
}

/** Parses `berkas/{berkasId}/validasi/{1|2}/{file}`. */
export function parseBerkasValidationTtdPathname(
  pathname: string,
): { berkasId: string; role: "1" | "2"; fileName: string } | null {
  if (typeof pathname !== "string" || !pathname.startsWith("berkas/")) {
    return null;
  }
  const segments = pathname.slice("berkas/".length).split("/");
  if (segments.length !== 4) return null;
  const [berkasId, section, role, fileName] = segments;
  if (!berkasId || !isUuid(berkasId)) return null;
  if (section !== "validasi") return null;
  if (role !== "1" && role !== "2") return null;
  if (!fileName || !isSafeImageFile(fileName)) return null;
  return { berkasId, role, fileName };
}

export function isBerkasValidationTtdPathname(pathname: string): boolean {
  return parseBerkasValidationTtdPathname(pathname) !== null;
}

/** Parses `berkas/{berkasId}/generated/{file}.pdf`. */
export function isValidBerkasGeneratedPdfPathname(
  pathname: string,
  berkasId: string,
): boolean {
  const prefix = `berkas/${berkasId}/generated/`;
  if (!pathname.startsWith(prefix)) return false;
  const fileName = pathname.slice(prefix.length);
  return fileName.length > 0 && !fileName.includes("/") && isSafePdfFile(fileName);
}

/**
 * Display-name sanitizer. It never decides storage identity; it only keeps a
 * filename safe for a header and for auditing. The original extension is kept.
 */
export function sanitizeBerkasFileName(fileName: string): string | null {
  if (typeof fileName !== "string") return null;
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^A-Za-z0-9._ -]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-._ ]+/, "")
    .replace(/[-._ ]+$/, "")
    .slice(0, 255);
  return cleaned.length > 0 ? cleaned : null;
}

export function isBerkasUploadKindValue(value: string): value is BerkasUploadKind {
  return isBerkasUploadKind(value);
}

/**
 * Builds a pathname that the token route and create service will both accept.
 * Keep this in sync with parseBerkasUploadPathname; callers still cannot choose
 * an arbitrary path because the server re-validates actor, batch and kind.
 */
export function buildBerkasUploadPathname(
  actorId: string,
  uploadId: string,
  kind: BerkasUploadKind,
  fileName: string,
  urutan?: number,
): string | null {
  if (!isUuid(actorId) || !isUuid(uploadId)) return null;
  const prefix = `${BERKAS_UPLOAD_PREFIX}${actorId}/${uploadId}`;
  if (kind === "original") {
    return isSafePdfFile(fileName) ? `${prefix}/original/${fileName}` : null;
  }
  if (kind === "penyusun_ttd") {
    if (urutan === undefined || !Number.isInteger(urutan) || urutan < 1 || urutan > 4) {
      return null;
    }
    return isSafeImageFile(fileName) ? `${prefix}/penyusun/${urutan}/${fileName}` : null;
  }
  return null;
}

/** Builds `berkas/{berkasId}/validasi/{1|2}/{fileName}` for a client upload. */
export function buildBerkasValidationTtdPathname(
  berkasId: string,
  role: BerkasValidationRole,
  fileName: string,
): string | null {
  if (!isUuid(berkasId) || !isSafeImageFile(fileName)) return null;
  const urutan = role === "validasi-1" ? "1" : "2";
  return `berkas/${berkasId}/validasi/${urutan}/${fileName}`;
}
