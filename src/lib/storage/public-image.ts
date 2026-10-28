import { BlobError, BlobNotFoundError, del, head } from "@vercel/blob";

// Thin, server-only wrapper around Vercel Blob for the PUBLIC CMS image store
// (`bdwika-cms`).
//
// Deliberately separate from @/lib/storage/blob, which is pinned to the PRIVATE
// Template & Form document store:
//   - this module never imports `openBlobDownload` and never asks for a stream;
//   - it always passes the CMS read-write token explicitly, so the SDK can
//     never fall back to `BLOB_READ_WRITE_TOKEN` (the private store token);
//   - no `storeId`/OIDC path is used, because the read-write token is the only
//     credential that can both verify metadata and mint a browser upload token.
//
// Authorization stays in the routes/services; this file only talks to storage.
// Credentials are never read into a return value, logged or serialized.

const CMS_BLOB_TOKEN_ENV = "CMS_BLOB_READ_WRITE_TOKEN";

export type PublicImageMetadata = {
  pathname: string;
  size: number;
  contentType: string;
  url: string;
};

export type PublicImageDeleteResult = {
  deleted: boolean;
  reason: "deleted" | "missing" | "not-configured";
};

/** The CMS public store has no usable credential configured. */
export class PublicImageStorageNotConfiguredError extends Error {
  constructor() {
    super("CMS public image storage is not configured");
    this.name = "PublicImageStorageNotConfiguredError";
  }
}

/** The CMS public store is configured but the request to it failed. */
export class PublicImageStorageUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("CMS public image storage request failed");
    this.name = "PublicImageStorageUnavailableError";
    this.cause = cause;
  }
}

/**
 * The CMS read-write token, or null when absent.
 *
 * Returned only to SDK calls in this module; never logged, never returned from
 * an API response and never persisted.
 */
function resolveCmsBlobToken(): string | null {
  const token = process.env[CMS_BLOB_TOKEN_ENV]?.trim();
  return token && token.length > 0 ? token : null;
}

export function isPublicImageStorageConfigured(): boolean {
  return resolveCmsBlobToken() !== null;
}

/**
 * The CMS read-write token for server-side SDK configuration (client-upload
 * token signing). Server-only: never serialize it into a response, log it or
 * import this module from a Client Component.
 */
export function resolveCmsBlobReadWriteToken(): string | null {
  return resolveCmsBlobToken();
}

function requireCmsToken(): string {
  const token = resolveCmsBlobToken();
  if (!token) {
    throw new PublicImageStorageNotConfiguredError();
  }
  return token;
}

function normalizeStorageError(error: unknown): Error {
  if (
    error instanceof PublicImageStorageNotConfiguredError ||
    error instanceof PublicImageStorageUnavailableError
  ) {
    return error;
  }
  if (
    error instanceof BlobError &&
    /no blob credentials|no read-write token/i.test(error.message)
  ) {
    return new PublicImageStorageNotConfiguredError();
  }
  return new PublicImageStorageUnavailableError(error);
}

/**
 * Metadata of a public CMS object, or null when it does not exist.
 *
 * `token` is always passed explicitly: without it the SDK would authenticate
 * with `BLOB_READ_WRITE_TOKEN` (the PRIVATE store) and look in the wrong store.
 */
export async function headPublicCmsImage(
  pathname: string,
): Promise<PublicImageMetadata | null> {
  const token = requireCmsToken();
  try {
    const result = await head(pathname, { token });
    return {
      pathname: result.pathname,
      size: result.size,
      contentType: result.contentType,
      url: result.url,
    };
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    throw normalizeStorageError(error);
  }
}

/**
 * Best-effort delete of a public CMS object. A missing object is not an error
 * (idempotent cleanup).
 *
 * Callers must already have verified that the object is CMS-owned and that no
 * CMS record references the pathname.
 */
export async function deletePublicCmsBlob(
  pathname: string,
): Promise<PublicImageDeleteResult> {
  const token = resolveCmsBlobToken();
  if (!token) {
    return { deleted: false, reason: "not-configured" };
  }
  try {
    await del(pathname, { token });
    return { deleted: true, reason: "deleted" };
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return { deleted: false, reason: "missing" };
    }
    throw normalizeStorageError(error);
  }
}

/**
 * Defence-in-depth probe: a public CMS object must answer 2xx to an anonymous
 * request. Returns null when the probe itself is inconclusive.
 */
export async function isPublicImageReachable(
  imageUrl: string,
): Promise<boolean | null> {
  try {
    const response = await fetch(imageUrl, {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return null;
  }
}
