import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Shared S3 (MinIO) plumbing for WIBEX storage.
//
// Two endpoints, deliberately:
//   - S3_ENDPOINT_INTERNAL is used by the server for every control-plane and
//     data operation (head/get/put/delete), so traffic stays on the private
//     network and never round-trips through the public hostname;
//   - S3_ENDPOINT_PUBLIC is used for (a) presigned PUT URLs, because SigV4 signs
//     the Host header and a URL signed for the internal host is rejected by the
//     public one, and (b) the canonical public object URL.
//
// Credentials are read here and handed to the SDK only. They are never logged,
// serialized, returned from a route or embedded in a URL.

export const S3_DEFAULT_REGION = "us-east-1";

export type S3BucketVisibility = "public" | "private";

export type S3Config = {
  internalEndpoint: string;
  publicEndpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketPublic: string;
  bucketPrivate: string;
};

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function stripLeadingSlashes(value: string): string {
  return value.replace(/^\/+/, "");
}

/**
 * The full S3 configuration, or null when any required variable is missing.
 * Every caller treats null as "storage not configured" (503), never as a
 * partially working setup.
 */
export function readS3Config(): S3Config | null {
  const internalEndpoint = readEnv("S3_ENDPOINT_INTERNAL");
  const publicEndpoint = readEnv("S3_ENDPOINT_PUBLIC");
  const accessKeyId = readEnv("S3_ACCESS_KEY");
  const secretAccessKey = readEnv("S3_SECRET_KEY");
  const bucketPublic = readEnv("S3_BUCKET_PUBLIC");
  const bucketPrivate = readEnv("S3_BUCKET_PRIVATE");

  if (
    !internalEndpoint ||
    !publicEndpoint ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucketPublic ||
    !bucketPrivate
  ) {
    return null;
  }

  return {
    internalEndpoint: stripTrailingSlashes(internalEndpoint),
    publicEndpoint: stripTrailingSlashes(publicEndpoint),
    region: readEnv("S3_REGION") ?? S3_DEFAULT_REGION,
    accessKeyId,
    secretAccessKey,
    bucketPublic,
    bucketPrivate,
  };
}

export function isS3Configured(): boolean {
  return readS3Config() !== null;
}

export function bucketNameFor(
  config: S3Config,
  visibility: S3BucketVisibility,
): string {
  return visibility === "public" ? config.bucketPublic : config.bucketPrivate;
}

type CachedClient = {
  key: string;
  client: S3Client;
};

let internalClient: CachedClient | null = null;
let presignClient: CachedClient | null = null;

function clientKey(config: S3Config, endpoint: string): string {
  // In-memory only. Never logged or persisted.
  return [
    endpoint,
    config.region,
    config.accessKeyId,
    config.secretAccessKey,
  ].join("\u0000");
}

function createClient(config: S3Config, endpoint: string): S3Client {
  return new S3Client({
    region: config.region,
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // Presigned PUT URLs must not carry SDK-generated checksum query
    // parameters: a browser PUT cannot produce the matching checksum header,
    // so MinIO would reject every upload with a signature error.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

/** Server-side client bound to the internal endpoint. */
export function getInternalS3Client(config: S3Config): S3Client {
  const key = clientKey(config, config.internalEndpoint);
  if (internalClient?.key !== key) {
    internalClient = {
      key,
      client: createClient(config, config.internalEndpoint),
    };
  }
  return internalClient.client;
}

/** Presign-only client bound to the public endpoint (Host is signed). */
export function getPresignS3Client(config: S3Config): S3Client {
  const key = clientKey(config, config.publicEndpoint);
  if (presignClient?.key !== key) {
    presignClient = {
      key,
      client: createClient(config, config.publicEndpoint),
    };
  }
  return presignClient.client;
}

function requireS3Config(): S3Config {
  const config = readS3Config();
  if (!config) {
    throw new Error("S3 storage is not configured");
  }
  return config;
}

/**
 * Canonical object URL: `${S3_ENDPOINT_PUBLIC}/${bucket}/${pathname}`.
 *
 * For the public bucket this is the URL the browser renders. For the private
 * bucket it is the object's address in the private namespace — it must NOT be
 * anonymously readable, which is exactly what the reachability probe asserts.
 */
export function objectUrl(
  visibility: S3BucketVisibility,
  pathname: string,
): string {
  const config = requireS3Config();
  const bucket = bucketNameFor(config, visibility);
  return `${config.publicEndpoint}/${bucket}/${stripLeadingSlashes(pathname)}`;
}

/**
 * Short-lived presigned PUT. `ContentType` is part of the signature, so the
 * browser must send exactly the content type the server approved.
 */
export async function presignPutObject(
  visibility: S3BucketVisibility,
  pathname: string,
  contentType: string,
  expiresInSeconds: number,
): Promise<string> {
  const config = requireS3Config();
  const client = getPresignS3Client(config);
  const command = new PutObjectCommand({
    Bucket: bucketNameFor(config, visibility),
    Key: stripLeadingSlashes(pathname),
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/** True for the S3/MinIO error shapes that mean "this key does not exist". */
export function isS3NotFoundError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as {
    name?: unknown;
    Code?: unknown;
    $metadata?: { httpStatusCode?: unknown };
  };
  if (candidate.name === "NotFound" || candidate.name === "NoSuchKey") {
    return true;
  }
  if (candidate.Code === "NoSuchKey" || candidate.Code === "NotFound") {
    return true;
  }
  return candidate.$metadata?.httpStatusCode === 404;
}
