import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { requireUser, UnauthenticatedError } from "@/lib/auth/current-user";
import {
  KnowledgeConflictError,
  KnowledgeForbiddenError,
  KnowledgeNotFoundError,
  KnowledgeValidationError,
  KnowledgeVersionConflictError,
  type KnowledgeActor,
} from "@/lib/knowledge-management/service";

// Shared HTTP plumbing for Knowledge Management routes (auth extraction, body
// parsing, expected_version parsing, domain-error mapping). No business logic
// lives here.

export async function getActor(): Promise<
  { actor: KnowledgeActor } | { response: NextResponse }
> {
  try {
    const user = await requireUser();
    return { actor: { id: user.id, role: user.role, status: user.status } };
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return {
        response: NextResponse.json({ error: { message: "Unauthenticated" } }, { status: 401 }),
      };
    }
    throw error;
  }
}

// A Zod failure is returned with the first, specific message (for example the
// 20.000-character content limit) so non-UI clients see the actual rule instead
// of a generic label. Field errors remain available in `details`.
export function validationErrorResponse(error: ZodError): NextResponse {
  const message = error.issues[0]?.message ?? "Validasi gagal";
  return NextResponse.json(
    { error: { message, details: error.flatten().fieldErrors } },
    { status: 400 },
  );
}

export function mapDomainError(error: unknown): NextResponse | null {
  if (error instanceof KnowledgeVersionConflictError) {
    return NextResponse.json({ error: { message: error.message } }, { status: 409 });
  }
  if (error instanceof KnowledgeNotFoundError) {
    return NextResponse.json({ error: { message: error.message } }, { status: 404 });
  }
  if (error instanceof KnowledgeForbiddenError) {
    return NextResponse.json({ error: { message: error.message } }, { status: 403 });
  }
  if (error instanceof KnowledgeConflictError) {
    return NextResponse.json({ error: { message: error.message } }, { status: 409 });
  }
  if (error instanceof KnowledgeValidationError) {
    return NextResponse.json({ error: { message: error.message } }, { status: 400 });
  }
  return null;
}

export async function parseJsonBody(request: Request): Promise<
  { body: unknown } | { response: NextResponse }
> {
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

// PUT reads the expected version from the JSON body; DELETE reads it from the
// query string. Both are integer >= 1. A missing or invalid value is a client
// error, never a version-conflict response.
export function parseExpectedVersion(value: unknown): number {
  if (typeof value === "number") {
    if (Number.isSafeInteger(value) && value >= 1) {
      return value;
    }
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^[0-9]+$/.test(trimmed)) {
      const parsed = Number(trimmed);
      if (Number.isSafeInteger(parsed) && parsed >= 1) {
        return parsed;
      }
    }
  }

  throw new KnowledgeValidationError(
    "expected_version wajib berupa bilangan bulat minimal 1",
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

export function invalidIdResponse(message = "ID tidak valid"): NextResponse {
  return NextResponse.json({ error: { message } }, { status: 400 });
}
