import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import {
  requireUser,
  UnauthenticatedError,
} from "@/lib/auth/current-user";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/pg/errors";
import { LearningForbiddenError } from "@/lib/learning/access";
import {
  LearningConflictError,
  LearningNotFoundError,
  LearningValidationError,
  type LearningActor,
} from "@/lib/learning/service";
import {
  BlobStorageNotConfiguredError,
  BlobStorageUnavailableError,
} from "@/lib/storage/blob";
import {
  PublicImageStorageNotConfiguredError,
  PublicImageStorageUnavailableError,
} from "@/lib/storage/public-image";

// Shared HTTP plumbing for Building Learning Center. No business logic.
// Catalogue data is user-scoped, so every response is private/no-store.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

export async function getActor(): Promise<LearningActor> {
  const user = await requireUser();
  return { id: user.id, role: user.role, status: user.status };
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: PRIVATE_HEADERS });
}

export function errorResponse(
  message: string,
  status: number,
  details?: Record<string, string[] | undefined>,
): NextResponse {
  return NextResponse.json(
    { error: details ? { message, details } : { message } },
    { status, headers: PRIVATE_HEADERS },
  );
}

export function validationErrorResponse(error: ZodError): NextResponse {
  return errorResponse(
    error.issues[0]?.message ?? "Validasi gagal",
    400,
    error.flatten().fieldErrors,
  );
}

export function invalidIdResponse(message = "ID tidak valid"): NextResponse {
  return errorResponse(message, 400);
}

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new LearningValidationError("Body harus berupa JSON yang valid");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw parsed.error;
  }
  return parsed.data;
}

function hasSqlState(error: unknown, code: string, depth = 0): boolean {
  if (depth > 3 || typeof error !== "object" || error === null) {
    return false;
  }
  const state = (error as { code?: unknown }).code;
  if (state === code) return true;
  const cause = (error as { cause?: unknown }).cause;
  return cause === error ? false : hasSqlState(cause, code, depth + 1);
}

export function mapDomainError(error: unknown): NextResponse | null {
  if (error instanceof UnauthenticatedError) {
    return errorResponse("Unauthenticated", 401);
  }
  if (error instanceof LearningForbiddenError) {
    return errorResponse(error.message, 403);
  }
  if (error instanceof LearningNotFoundError) {
    return errorResponse(error.message, 404);
  }
  if (error instanceof LearningConflictError) {
    return errorResponse(error.message, 409);
  }
  if (error instanceof LearningValidationError) {
    return errorResponse(error.message, 400);
  }
  if (error instanceof BlobStorageNotConfiguredError) {
    return errorResponse("Layanan penyimpanan file belum dikonfigurasi.", 503);
  }
  if (error instanceof BlobStorageUnavailableError) {
    return errorResponse("Layanan penyimpanan file sedang tidak tersedia.", 502);
  }
  if (error instanceof PublicImageStorageNotConfiguredError) {
    return errorResponse("Penyimpanan gambar belum dikonfigurasi.", 503);
  }
  if (error instanceof PublicImageStorageUnavailableError) {
    return errorResponse("Penyimpanan gambar sedang tidak tersedia.", 502);
  }
  if (error instanceof ZodError) {
    return validationErrorResponse(error);
  }
  if (isUniqueViolation(error)) {
    return errorResponse("Data Building Learning Center sudah ada", 409);
  }
  if (isForeignKeyViolation(error)) {
    return errorResponse("Data terkait sudah tidak tersedia", 409);
  }
  if (hasSqlState(error, "23514")) {
    return errorResponse("Data tidak memenuhi aturan database", 400);
  }
  return null;
}

export function handleRouteError(
  error: unknown,
  label: string,
): NextResponse {
  const mapped = mapDomainError(error);
  if (mapped) return mapped;
  console.error(label, error);
  return errorResponse("Terjadi kesalahan server", 500);
}
