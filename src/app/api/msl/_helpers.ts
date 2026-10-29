import { NextResponse } from "next/server";
import { requireUser, UnauthenticatedError } from "@/lib/auth/current-user";
import { isMslMonth } from "@/lib/msl/period";
import {
  MslConflictError,
  MslForbiddenError,
  MslNotFoundError,
  MslValidationError,
  type MslActor,
} from "@/lib/msl/service";

// Shared HTTP plumbing for MSL routes (actor extraction, body parsing, query
// parsing, domain-error mapping). No business logic lives here.
//
// The actor is always taken from the server session — role and the
// `mslAccess` capability are never read from the request, so a browser cannot
// claim either one.

export async function getActor(): Promise<
  { actor: MslActor } | { response: NextResponse }
> {
  try {
    const user = await requireUser();
    return {
      actor: {
        id: user.id,
        role: user.role,
        status: user.status,
        mslAccess: user.mslAccess,
      },
    };
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return {
        response: NextResponse.json(
          { error: { message: "Unauthenticated" } },
          { status: 401 },
        ),
      };
    }
    throw error;
  }
}

export function mapDomainError(error: unknown): NextResponse | null {
  if (error instanceof MslNotFoundError) {
    return NextResponse.json({ error: { message: error.message } }, { status: 404 });
  }
  if (error instanceof MslForbiddenError) {
    return NextResponse.json({ error: { message: error.message } }, { status: 403 });
  }
  if (error instanceof MslConflictError) {
    return NextResponse.json({ error: { message: error.message } }, { status: 409 });
  }
  if (error instanceof MslValidationError) {
    return NextResponse.json({ error: { message: error.message } }, { status: 400 });
  }
  return null;
}

export async function parseJsonBody(
  request: Request,
): Promise<{ body: unknown } | { response: NextResponse }> {
  try {
    return { body: await request.json() };
  } catch {
    return {
      response: NextResponse.json(
        { error: { message: "Body harus berupa JSON yang valid" } },
        { status: 400 },
      ),
    };
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

export function invalidIdResponse(): NextResponse {
  return NextResponse.json(
    { error: { message: "ID penilaian MSL tidak valid" } },
    { status: 400 },
  );
}

// Query strings are always strings, so the year is parsed explicitly instead of
// coerced: only a run of digits is accepted, which rejects "2026.5", "abc",
// "2026abc", "" and negatives before any coercion can hide them.
export function parseYearQuery(
  raw: string | null,
): { year?: number } | { response: NextResponse } {
  if (raw === null) {
    return {};
  }
  if (!/^\d+$/.test(raw)) {
    return { response: invalidYearResponse() };
  }
  const year = Number(raw);
  if (!Number.isSafeInteger(year) || year < 2000) {
    return { response: invalidYearResponse() };
  }
  return { year };
}

export function invalidYearResponse(): NextResponse {
  return NextResponse.json(
    { error: { message: "Tahun MSL tidak valid" } },
    { status: 400 },
  );
}

// Month follows the same rule as year: parse explicitly from digits only, so
// "03" is fine while "3.5", "-1", "abc" and "" are rejected before coercion.
// The range check is the domain rule (1–12), not a formatting concern.
export function parseMonthQuery(
  raw: string | null,
): { month?: number } | { response: NextResponse } {
  if (raw === null) {
    return {};
  }
  if (!/^\d+$/.test(raw)) {
    return { response: invalidMonthResponse() };
  }
  const month = Number(raw);
  if (!isMslMonth(month)) {
    return { response: invalidMonthResponse() };
  }
  return { month };
}

export function invalidMonthResponse(): NextResponse {
  return NextResponse.json(
    { error: { message: "Bulan MSL tidak valid" } },
    { status: 400 },
  );
}
