import { NextResponse } from "next/server";
import { requireUser, UnauthenticatedError } from "@/lib/auth/current-user";
import {
  TemplateFormConflictError,
  TemplateFormForbiddenError,
  TemplateFormNotFoundError,
  TemplateFormValidationError,
  type TemplateFormActor,
} from "@/lib/template-form/service";
import {
  BlobStorageNotConfiguredError,
  BlobStorageUnavailableError,
} from "@/lib/storage/blob";

export async function getActor(): Promise<
  { actor: TemplateFormActor } | { response: NextResponse }
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
  if (error instanceof TemplateFormNotFoundError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 404 },
    );
  }
  if (error instanceof TemplateFormForbiddenError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 403 },
    );
  }
  if (error instanceof TemplateFormConflictError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 409 },
    );
  }
  // Domain-level validation that the Zod contract cannot express (uploaded
  // object missing, pathname outside the namespace, metadata mismatch, ...).
  if (error instanceof TemplateFormValidationError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 400 },
    );
  }
  // Storage infrastructure is unavailable; never leak the SDK message.
  if (error instanceof BlobStorageNotConfiguredError) {
    return NextResponse.json(
      {
        error: {
          message: "Layanan penyimpanan file belum dikonfigurasi.",
        },
      },
      { status: 503 },
    );
  }
  if (error instanceof BlobStorageUnavailableError) {
    return NextResponse.json(
      { error: { message: "Layanan penyimpanan file sedang tidak tersedia." } },
      { status: 502 },
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
    { error: { message: "ID Template / Form tidak valid" } },
    { status: 400 },
  );
}
