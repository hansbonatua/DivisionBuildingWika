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
import {
  ProjectDocumentationConflictError,
  ProjectDocumentationForbiddenError,
  ProjectDocumentationNotFoundError,
  ProjectDocumentationValidationError,
  type ProjectDocumentationActor,
} from "@/lib/project-documentation/service";

// Shared HTTP plumbing for Project Documentation routes (actor extraction,
// JSON/schema parsing, domain-error mapping). No business logic lives here.

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function getActor(): Promise<ProjectDocumentationActor> {
  const user = await requireUser();
  return { id: user.id, role: user.role, status: user.status };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export type PdocPeriodParams = {
  year: number;
  month: number;
};

function parseYear(value: string | null): number | null {
  if (value === null || !/^\d{4}$/.test(value)) return null;
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 ? year : null;
}

function parseMonth(value: string | null): number | null {
  if (value === null || !/^\d{1,2}$/.test(value)) return null;
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : null;
}

function invalidPeriod(): never {
  throw new ProjectDocumentationValidationError(
    "Periode dokumentasi tidak valid",
  );
}

export function parsePeriodQuery(request: Request): PdocPeriodParams {
  const url = new URL(request.url);
  const year = parseYear(url.searchParams.get("year"));
  const month = parseMonth(url.searchParams.get("month"));
  if (year === null || month === null) invalidPeriod();
  return { year, month };
}

export function parsePeriodPath(
  yearParam: string,
  monthParam: string,
): PdocPeriodParams {
  const year = parseYear(yearParam);
  const month = parseMonth(monthParam);
  if (year === null || month === null) invalidPeriod();
  return { year, month };
}

export function parseYearQuery(request: Request): number {
  const year = parseYear(new URL(request.url).searchParams.get("year"));
  if (year === null) invalidPeriod();
  return year;
}

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ProjectDocumentationValidationError(
      "Body harus berupa JSON yang valid",
    );
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
    { status: 400, headers: NO_STORE },
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
      { status: 401, headers: NO_STORE },
    );
  }
  if (error instanceof ProjectDocumentationForbiddenError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 403, headers: NO_STORE },
    );
  }
  if (error instanceof ProjectDocumentationNotFoundError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 404, headers: NO_STORE },
    );
  }
  if (error instanceof ProjectDocumentationConflictError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 409, headers: NO_STORE },
    );
  }
  if (error instanceof ProjectDocumentationValidationError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 400, headers: NO_STORE },
    );
  }
  if (error instanceof ZodError) {
    return validationErrorResponse(error);
  }
  if (isUniqueViolation(error) || isForeignKeyViolation(error)) {
    return NextResponse.json(
      { error: { message: "Dokumentasi project tidak dapat disimpan" } },
      { status: 409, headers: NO_STORE },
    );
  }
  if (hasSqlState(error, "23514")) {
    return NextResponse.json(
      { error: { message: "Data tidak memenuhi aturan database" } },
      { status: 400, headers: NO_STORE },
    );
  }
  return null;
}

export function internalError(message = "Terjadi kesalahan server"): NextResponse {
  return NextResponse.json(
    { error: { message } },
    { status: 500, headers: NO_STORE },
  );
}

export function invalidIdResponse(message = "ID project tidak valid"): NextResponse {
  return NextResponse.json(
    { error: { message } },
    { status: 400, headers: NO_STORE },
  );
}

export function handleRouteError(error: unknown, label: string): NextResponse {
  const mapped = mapDomainError(error);
  if (mapped) return mapped;
  console.error(label, error);
  return internalError();
}
