import { BlobError, BlobNotFoundError, del, get, head } from "@vercel/blob";

// Thin, server-only wrapper around Vercel Blob (private store).
//
// Responsibilities ONLY: read/write metadata, stream a private download, delete
// an object, and normalize infrastructure failures into a small set of typed
// errors. Authorization belongs to the Template & Form service/routes.
//
// Credentials resolve exactly like the SDK does:
//   - BLOB_READ_WRITE_TOKEN (static, local development / non-Vercel hosts)
//   - VERCEL_OIDC_TOKEN + BLOB_STORE_ID (OIDC, injected by Vercel for a
//     connected store — no static token required in production)
// Nothing here ever reads, logs or returns the credential value.

export type BlobObjectMetadata = {
  pathname: string;
  size: number;
  contentType: string;
  url: string;
  uploadedAt: Date;
};

export type BlobDownload = {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  size: number;
};

export type BlobDeleteResult = {
  deleted: boolean;
  reason: "deleted" | "missing" | "not-configured";
};

/** Storage is unreachable because no credential/store is configured. */
export class BlobStorageNotConfiguredError extends Error {
  constructor() {
    super("Vercel Blob is not configured");
    this.name = "BlobStorageNotConfiguredError";
  }
}

/** Storage is configured but the request to it failed. */
export class BlobStorageUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Vercel Blob request failed");
    this.name = "BlobStorageUnavailableError";
    this.cause = cause;
  }
}

export function isBlobStorageConfigured(): boolean {
  const readWriteToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (readWriteToken) return true;
  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();
  const storeId = process.env.BLOB_STORE_ID?.trim();
  return Boolean(oidcToken && storeId);
}

/**
 * Client uploads are a SEPARATE capability from reads: `handleUpload` signs the
 * browser's upload token with the static read-write token, so OIDC alone can
 * never mint one (verified live: the SDK throws before any request is made).
 * Route handlers use this to answer 503 instead of failing deep inside the SDK.
 */
export function isBlobClientUploadConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function normalizeStorageError(error: unknown): Error {
  if (
    error instanceof BlobStorageNotConfiguredError ||
    error instanceof BlobStorageUnavailableError
  ) {
    return error;
  }
  if (
    error instanceof BlobError &&
    /no blob credentials|no read-write token/i.test(error.message)
  ) {
    return new BlobStorageNotConfiguredError();
  }
  return new BlobStorageUnavailableError(error);
}

async function requireConfigured(): Promise<void> {
  if (!isBlobStorageConfigured()) {
    throw new BlobStorageNotConfiguredError();
  }
}

/**
 * Metadata of a stored object, or null when it does not exist.
 * Works for private blobs: the control-plane metadata call is token-scoped.
 */
export async function headBlob(
  pathname: string,
): Promise<BlobObjectMetadata | null> {
  await requireConfigured();
  try {
    const result = await head(pathname);
    return {
      pathname: result.pathname,
      size: result.size,
      contentType: result.contentType,
      url: result.url,
      uploadedAt: result.uploadedAt,
    };
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    throw normalizeStorageError(error);
  }
}

/**
 * Reads a PRIVATE blob as a stream. `access: "private"` is mandatory for the
 * private store and is pinned here, never accepted from a caller or client.
 */
export async function openBlobDownload(
  pathname: string,
): Promise<BlobDownload | null> {
  await requireConfigured();
  try {
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return null;
    }
    return {
      stream: result.stream,
      contentType: result.blob.contentType,
      size: result.blob.size,
    };
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    throw normalizeStorageError(error);
  }
}

/**
 * Best-effort delete. A missing object is not an error (idempotent cleanup).
 * Callers must have already verified that no Template & Form row references the
 * pathname.
 */
export async function deleteBlob(
  pathname: string,
): Promise<BlobDeleteResult> {
  if (!isBlobStorageConfigured()) {
    return { deleted: false, reason: "not-configured" };
  }
  try {
    await del(pathname);
    return { deleted: true, reason: "deleted" };
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return { deleted: false, reason: "missing" };
    }
    throw normalizeStorageError(error);
  }
}

/**
 * Defence-in-depth probe: is the object downloadable WITHOUT credentials?
 *
 * A private-store object must not answer 2xx to an anonymous request. Returns
 * null when the probe itself is inconclusive (network failure), so callers can
 * distinguish "definitely public" from "could not check".
 */
export async function isBlobPubliclyReachable(
  blobUrl: string,
): Promise<boolean | null> {
  try {
    const response = await fetch(blobUrl, {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return null;
  }
}
