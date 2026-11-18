import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import {
  requireUser,
  UnauthenticatedError,
} from "@/lib/auth/current-user";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/pg/errors";
import { GreenBuildingEsgForbiddenError } from "@/lib/green-building-esg/access";
import {
  GreenBuildingEsgConflictError,
  GreenBuildingEsgNotFoundError,
  GreenBuildingEsgValidationError,
  type GreenBuildingEsgActor,
} from "@/lib/green-building-esg/service";

// Shared HTTP plumbing for Database Green Building & ESG. No business logic.
// Every response is private because certificate/project data is user-scoped.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

export async function getActor(): Promise<GreenBuildingEsgActor> {
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
    throw new GreenBuildingEsgValidationError(
      "Body harus berupa JSON yang valid",
    );
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
  if (error instanceof GreenBuildingEsgForbiddenError) {
    return errorResponse(error.message, 403);
  }
  if (error instanceof GreenBuildingEsgNotFoundError) {
    return errorResponse(error.message, 404);
  }
  if (error instanceof GreenBuildingEsgConflictError) {
    return errorResponse(error.message, 409);
  }
  if (error instanceof GreenBuildingEsgValidationError) {
    return errorResponse(error.message, 400);
  }
  if (error instanceof ZodError) {
    return validationErrorResponse(error);
  }
  if (isUniqueViolation(error)) {
    return errorResponse("Data sertifikat sudah ada", 409);
  }
  if (isForeignKeyViolation(error)) {
    return errorResponse("Data terkait sudah tidak tersedia", 409);
  }
  if (hasSqlState(error, "23514")) {
    return errorResponse("Data tidak memenuhi aturan database", 400);
  }
  return null;
}

export function handleRouteError(error: unknown, label: string): NextResponse {
  const mapped = mapDomainError(error);
  if (mapped) return mapped;
  console.error(label, error);
  return errorResponse("Terjadi kesalahan server", 500);
}
