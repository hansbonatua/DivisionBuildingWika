import { NextResponse } from "next/server";
import { requireUser, UnauthenticatedError } from "@/lib/auth/current-user";
import {
  MasterProjectConflictError,
  MasterProjectForbiddenError,
  MasterProjectNotFoundError,
  type MasterProjectActor,
} from "@/lib/master-project/service";

export async function getActor(): Promise<
  { actor: MasterProjectActor } | { response: NextResponse }
> {
  try {
    const user = await requireUser();
    return { actor: { id: user.id, role: user.role, status: user.status } };
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
  if (error instanceof MasterProjectNotFoundError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 404 },
    );
  }
  if (error instanceof MasterProjectForbiddenError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 403 },
    );
  }
  if (error instanceof MasterProjectConflictError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 409 },
    );
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

export function invalidIdResponse(): NextResponse {
  return NextResponse.json(
    { error: { message: "ID Master Project tidak valid" } },
    { status: 400 },
  );
}
