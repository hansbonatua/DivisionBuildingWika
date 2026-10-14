import { NextResponse } from "next/server";
import { requireUser, UnauthenticatedError } from "@/lib/auth/current-user";
import {
  ProgramKerjaConflictError,
  ProgramKerjaForbiddenError,
  ProgramKerjaNotFoundError,
  ProgramKerjaValidationError,
  type ProgramKerjaActor,
} from "@/lib/program-kerja/service";

// Shared HTTP plumbing for Program Kerja routes (auth extraction, body
// parsing, domain-error mapping). No business logic lives here.

export async function getActor(): Promise<
  { actor: ProgramKerjaActor } | { response: NextResponse }
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

export function mapDomainError(error: unknown): NextResponse | null {
  if (error instanceof ProgramKerjaNotFoundError) {
    return NextResponse.json({ error: { message: error.message } }, { status: 404 });
  }
  if (error instanceof ProgramKerjaForbiddenError) {
    return NextResponse.json({ error: { message: error.message } }, { status: 403 });
  }
  if (error instanceof ProgramKerjaConflictError) {
    return NextResponse.json({ error: { message: error.message } }, { status: 409 });
  }
  if (error instanceof ProgramKerjaValidationError) {
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function invalidIdResponse(): NextResponse {
  return NextResponse.json(
    { error: { message: "ID Program Kerja tidak valid" } },
    { status: 400 },
  );
}

export function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}
