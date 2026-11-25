import { NextResponse } from "next/server";
import {
  objectUrl,
  presignPutObject,
  type S3BucketVisibility,
} from "@/lib/storage/s3";

// Shared contract for the seven upload-token routes.
//
// The browser asks for a ticket with `{ pathname, contentType, sizeBytes,
// clientPayload }`; the route re-validates RBAC, the pathname shape, the
// content type and the declared size, refuses to overwrite an existing object,
// and answers with a presigned PUT plus the canonical object URL. Bytes never
// pass through the server.

export const PRESIGN_TTL_SECONDS = 10 * 60;

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

export type UploadTicketRequest = {
  pathname: string;
  contentType: string;
  sizeBytes: number;
  clientPayload: Record<string, unknown> | null;
};

/**
 * Client payload used to be a JSON string (Vercel's `clientPayload`); the new
 * browser helper sends an object. Both shapes are accepted so a stale client
 * tab cannot mint a ticket with a silently ignored payload.
 */
export function parseClientPayload(
  raw: unknown,
): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return typeof raw === "object" ? (raw as Record<string, unknown>) : null;
}

export async function readUploadTicketRequest(
  request: Request,
): Promise<UploadTicketRequest | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }
  if (typeof body !== "object" || body === null) return null;

  const record = body as {
    pathname?: unknown;
    contentType?: unknown;
    sizeBytes?: unknown;
    clientPayload?: unknown;
  };
  if (typeof record.pathname !== "string" || record.pathname.length === 0) {
    return null;
  }
  if (typeof record.contentType !== "string" || record.contentType.length === 0) {
    return null;
  }
  if (
    typeof record.sizeBytes !== "number" ||
    !Number.isInteger(record.sizeBytes) ||
    record.sizeBytes <= 0
  ) {
    return null;
  }

  return {
    pathname: record.pathname,
    contentType: record.contentType,
    sizeBytes: record.sizeBytes,
    clientPayload: parseClientPayload(record.clientPayload),
  };
}

/** Declared-size guard. The authoritative check still runs on claim (head). */
export function isDeclaredSizeAllowed(
  sizeBytes: number,
  maxBytes: number,
): boolean {
  return sizeBytes > 0 && sizeBytes <= maxBytes;
}

export function declaredSizeRejected(
  message: string,
): NextResponse {
  return NextResponse.json(
    { error: { message } },
    { status: 413, headers: NO_STORE_HEADERS },
  );
}

export function contentTypeRejected(message: string): NextResponse {
  return NextResponse.json(
    { error: { message } },
    { status: 415, headers: NO_STORE_HEADERS },
  );
}

export function uploadRequestRejected(message: string): NextResponse {
  return NextResponse.json(
    { error: { message } },
    { status: 400, headers: NO_STORE_HEADERS },
  );
}

/**
 * Builds the ticket. `alreadyExists` comes from a server-side head() on the
 * exact pathname, which is what makes overwrite impossible: the key embeds a
 * fresh UUID, and a replay of the same request is refused instead of silently
 * replacing bytes.
 */
export async function createUploadTicket(input: {
  visibility: S3BucketVisibility;
  pathname: string;
  contentType: string;
  alreadyExists: boolean;
}): Promise<NextResponse> {
  if (input.alreadyExists) {
    return NextResponse.json(
      { error: { message: "Objek dengan pathname tersebut sudah ada. Unggah ulang." } },
      { status: 409, headers: NO_STORE_HEADERS },
    );
  }

  const presignedUrl = await presignPutObject(
    input.visibility,
    input.pathname,
    input.contentType,
    PRESIGN_TTL_SECONDS,
  );

  return NextResponse.json(
    {
      presignedUrl,
      pathname: input.pathname,
      url: objectUrl(input.visibility, input.pathname),
      contentType: input.contentType,
      expiresIn: PRESIGN_TTL_SECONDS,
    },
    { status: 200, headers: NO_STORE_HEADERS },
  );
}
