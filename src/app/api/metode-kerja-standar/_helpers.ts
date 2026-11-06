import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import {
  requireUser,
  UnauthenticatedError,
} from "@/lib/auth/current-user";
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from "@/lib/pg/errors";
import { MetodeKerjaForbiddenError } from "@/lib/metode-kerja-standar/access";
import {
  MetodeKerjaConflictError,
  MetodeKerjaNotFoundError,
  MetodeKerjaValidationError,
  type MetodeKerjaActor,
} from "@/lib/metode-kerja-standar/service";

// Shared HTTP plumbing for Metode Kerja Standar. No business logic lives here.

export async function getActor(): Promise<MetodeKerjaActor> {
  const user = await requireUser();
  return { id: user.id, role: user.role, status: user.status };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new MetodeKerjaValidationError("Body harus berupa JSON yang valid");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw parsed.error;
  }
  return parsed.data;
}

function validationErrorResponse(error: ZodError): NextResponse {
  const message = error.issues[0]?.message ?? "Validasi gagal";
  return NextResponse.json(
    { error: { message, details: error.flatten().fieldErrors } },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}

function hasSqlState(error: unknown, code: string, depth = 0): boolean {
  if (depth > 3 || typeof error !== "object" || error === null) {
    return false;
  }
  const state = (error as { code?: unknown }).code;
  if (state === code) {
    return true;
  }
  const cause = (error as { cause?: unknown }).cause;
  return cause === error ? false : hasSqlState(cause, code, depth + 1);
}

export function mapDomainError(error: unknown): NextResponse | null {
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json(
      { error: { message: "Unauthenticated" } },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (error instanceof MetodeKerjaForbiddenError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (error instanceof MetodeKerjaNotFoundError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (error instanceof MetodeKerjaConflictError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (error instanceof MetodeKerjaValidationError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (error instanceof ZodError) {
    return validationErrorResponse(error);
  }
  if (isUniqueViolation(error)) {
    return NextResponse.json(
      { error: { message: "Data dengan kode tersebut sudah ada" } },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (isForeignKeyViolation(error)) {
    return NextResponse.json(
      { error: { message: "Data terkait sudah tidak tersedia" } },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (hasSqlState(error, "23514")) {
    return NextResponse.json(
      { error: { message: "Data tidak memenuhi aturan database" } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  return null;
}

export function internalError(message = "Terjadi kesalahan server"): NextResponse {
  return NextResponse.json(
    { error: { message } },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

export function invalidIdResponse(message = "ID tidak valid"): NextResponse {
  return NextResponse.json(
    { error: { message } },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json(
    { error: { message } },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}

export function handleRouteError(error: unknown, label: string): NextResponse {
  const mapped = mapDomainError(error);
  if (mapped) return mapped;
  console.error(label, error);
  return internalError();
}
