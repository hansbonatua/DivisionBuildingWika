import { Readable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import {
  getInternalS3Client,
  isS3Configured,
  isS3NotFoundError,
  objectUrl,
  readS3Config,
} from "@/lib/storage/s3";

// Thin, server-only wrapper around the PRIVATE S3 (MinIO) bucket.
//
// Responsibilities ONLY: read/write metadata, stream a private download, delete
// an object, and normalize infrastructure failures into a small set of typed
// errors. Authorization belongs to the module services/routes.
//
// The exported surface is unchanged from the Vercel Blob implementation on
// purpose: callers keep calling headBlob / openBlobDownload / putPrivateBlob /
// deleteBlob and keep receiving the same shapes. Only the transport moved.
//
// Credentials live in @/lib/storage/s3 and are never read, logged or returned
// from here.

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
    super("Object storage is not configured");
    this.name = "BlobStorageNotConfiguredError";
  }
}

/** Storage is configured but the request to it failed. */
export class BlobStorageUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Object storage request failed");
    this.name = "BlobStorageUnavailableError";
    this.cause = cause;
  }
}

export function isBlobStorageConfigured(): boolean {
  return isS3Configured();
}

/**
 * Minting a presigned PUT is a SEPARATE capability from reads: it needs the
 * access key pair, which is exactly what `isS3Configured()` proves. Route
 * handlers use this to answer 503 instead of failing deep inside the SDK.
 */
export function isBlobClientUploadConfigured(): boolean {
  return isS3Configured();
}

function normalizeStorageError(error: unknown): Error {
  if (
    error instanceof BlobStorageNotConfiguredError ||
    error instanceof BlobStorageUnavailableError
  ) {
    return error;
  }
  return new BlobStorageUnavailableError(error);
}

function requireConfig() {
  const config = readS3Config();
  if (!config) {
    throw new BlobStorageNotConfiguredError();
  }
  return config;
}

/**
 * Metadata of a stored object, or null when it does not exist.
 * `url` is the object's address in the private namespace; the reachability
 * probe relies on it NOT answering 2xx anonymously.
 */
export async function headBlob(
  pathname: string,
): Promise<BlobObjectMetadata | null> {
  const config = requireConfig();
  try {
    const result = await getInternalS3Client(config).send(
      new HeadObjectCommand({
        Bucket: config.bucketPrivate,
        Key: pathname,
      }),
    );
    return {
      pathname,
      size: result.ContentLength ?? 0,
      contentType: result.ContentType ?? "application/octet-stream",
      url: objectUrl("private", pathname),
      uploadedAt: result.LastModified ?? new Date(),
    };
  } catch (error) {
    if (isS3NotFoundError(error)) return null;
    throw normalizeStorageError(error);
  }
}

/**
 * Reads a PRIVATE object as a stream. The bucket is pinned here, never
 * accepted from a caller or client.
 */
export async function openBlobDownload(
  pathname: string,
): Promise<BlobDownload | null> {
  const config = requireConfig();
  try {
    const result = await getInternalS3Client(config).send(
      new GetObjectCommand({
        Bucket: config.bucketPrivate,
        Key: pathname,
      }),
    );
    if (!result.Body) return null;
    return {
      stream: Readable.toWeb(
        result.Body as Readable,
      ) as ReadableStream<Uint8Array>,
      contentType: result.ContentType ?? "application/octet-stream",
      size: result.ContentLength ?? 0,
    };
  } catch (error) {
    if (isS3NotFoundError(error)) return null;
    throw normalizeStorageError(error);
  }
}

/**
 * Writes bytes owned by the server to the PRIVATE bucket. Bucket and collision
 * policy are pinned here: callers cannot accidentally write to the public
 * bucket or overwrite an existing object. Client-uploaded files never come
 * through this helper; they arrive through a presigned PUT.
 */
export async function putPrivateBlob(
  pathname: string,
  body: Uint8Array | string | Readable,
  contentType: string,
): Promise<BlobObjectMetadata> {
  const config = requireConfig();
  try {
    await getInternalS3Client(config).send(
      new PutObjectCommand({
        Bucket: config.bucketPrivate,
        Key: pathname,
        Body: body,
        ContentType: contentType,
      }),
    );
    // Read the authoritative metadata once so callers get the same shape as
    // headBlob(), including the stored size.
    const metadata = await headBlob(pathname);
    if (metadata) return metadata;
    return {
      pathname,
      size: 0,
      contentType,
      url: objectUrl("private", pathname),
      uploadedAt: new Date(),
    };
  } catch (error) {
    throw normalizeStorageError(error);
  }
}

/**
 * Best-effort delete. A missing object is not an error (idempotent cleanup).
 * Callers must have already verified that no record references the pathname.
 */
export async function deleteBlob(
  pathname: string,
): Promise<BlobDeleteResult> {
  const config = readS3Config();
  if (!config) {
    return { deleted: false, reason: "not-configured" };
  }
  try {
    // S3 DeleteObject is idempotent and answers 204 for a missing key, so the
    // existence probe is what keeps the "missing" outcome meaningful.
    const existing = await headBlob(pathname);
    if (!existing) {
      return { deleted: false, reason: "missing" };
    }
    await getInternalS3Client(config).send(
      new DeleteObjectCommand({
        Bucket: config.bucketPrivate,
        Key: pathname,
      }),
    );
    return { deleted: true, reason: "deleted" };
  } catch (error) {
    if (isS3NotFoundError(error)) {
      return { deleted: false, reason: "missing" };
    }
    throw normalizeStorageError(error);
  }
}

/**
 * Defence-in-depth probe: is the object downloadable WITHOUT credentials?
 *
 * A private-bucket object must not answer 2xx to an anonymous request. Returns
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

/**
 * Safe inline `Content-Disposition`. PDFs are streamed through the authenticated
 * viewer route, never through a public URL; this header keeps the browser from
 * forcing a download while still providing a useful filename.
 *
 * A quoted ASCII fallback plus RFC 5987 encoding handles non-ASCII titles
 * without allowing header injection.
 */
function contentDisposition(type: "inline" | "attachment", fileName: string): string {
  const cleaned = fileName
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/["\\]/g, "")
    .trim();
  const safeName = cleaned.length > 0 ? cleaned : "berkas.pdf";
  const asciiFallback =
    safeName.replace(/[^\x20-\x7e]/g, "_") || "berkas.pdf";
  return `${type}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(
    safeName,
  )}`;
}

export function contentDispositionInline(fileName: string): string {
  return contentDisposition("inline", fileName);
}

export function contentDispositionAttachment(fileName: string): string {
  return contentDisposition("attachment", fileName);
}
