import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import {
  getInternalS3Client,
  isS3Configured,
  isS3NotFoundError,
  objectUrl,
  readS3Config,
} from "@/lib/storage/s3";

// Thin, server-only wrapper around the PUBLIC S3 (MinIO) bucket
// (`S3_BUCKET_PUBLIC`, default `wibex-public`).
//
// Deliberately separate from @/lib/storage/blob, which is pinned to the PRIVATE
// bucket:
//   - this module never opens a download stream;
//   - every operation targets the public bucket explicitly, so an image can
//     never be written into the document bucket by accident;
//   - the exported surface is unchanged from the Vercel Blob implementation, so
//     callers keep using headPublicCmsImage / deletePublicCmsBlob as before.
//
// Authorization stays in the routes/services; this file only talks to storage.

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

/** The public bucket has no usable credential configured. */
export class PublicImageStorageNotConfiguredError extends Error {
  constructor() {
    super("Public image storage is not configured");
    this.name = "PublicImageStorageNotConfiguredError";
  }
}

/** The public bucket is configured but the request to it failed. */
export class PublicImageStorageUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Public image storage request failed");
    this.name = "PublicImageStorageUnavailableError";
    this.cause = cause;
  }
}

export function isPublicImageStorageConfigured(): boolean {
  return isS3Configured();
}

function requireConfig() {
  const config = readS3Config();
  if (!config) {
    throw new PublicImageStorageNotConfiguredError();
  }
  return config;
}

function normalizeStorageError(error: unknown): Error {
  if (
    error instanceof PublicImageStorageNotConfiguredError ||
    error instanceof PublicImageStorageUnavailableError
  ) {
    return error;
  }
  return new PublicImageStorageUnavailableError(error);
}

/**
 * Metadata of a public object, or null when it does not exist.
 *
 * `url` is the canonical public URL, i.e. exactly the string a record stores.
 * Verification compares the stored URL against it, so a record can never claim
 * an object that lives somewhere else.
 */
export async function headPublicCmsImage(
  pathname: string,
): Promise<PublicImageMetadata | null> {
  const config = requireConfig();
  try {
    const result = await getInternalS3Client(config).send(
      new HeadObjectCommand({
        Bucket: config.bucketPublic,
        Key: pathname,
      }),
    );
    return {
      pathname,
      size: result.ContentLength ?? 0,
      contentType: result.ContentType ?? "application/octet-stream",
      url: objectUrl("public", pathname),
    };
  } catch (error) {
    if (isS3NotFoundError(error)) return null;
    throw normalizeStorageError(error);
  }
}

/**
 * Best-effort delete of a public object. A missing object is not an error
 * (idempotent cleanup).
 *
 * Callers must already have verified that the object is CMS-owned and that no
 * record references the pathname.
 */
export async function deletePublicCmsBlob(
  pathname: string,
): Promise<PublicImageDeleteResult> {
  const config = readS3Config();
  if (!config) {
    return { deleted: false, reason: "not-configured" };
  }
  try {
    const existing = await headPublicCmsImage(pathname);
    if (!existing) {
      return { deleted: false, reason: "missing" };
    }
    await getInternalS3Client(config).send(
      new DeleteObjectCommand({
        Bucket: config.bucketPublic,
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
 * Defence-in-depth probe: a public object must answer 2xx to an anonymous
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
