import { NextResponse } from "next/server";
import {
  BerkasConflictError,
  BerkasForbiddenError,
  BerkasNotFoundError,
  BerkasPdfError,
  BerkasValidationError,
  type BerkasActor,
} from "@/lib/berkas/service";
import { requireUser, UnauthenticatedError } from "@/lib/auth/current-user";
import {
  BlobStorageNotConfiguredError,
  BlobStorageUnavailableError,
} from "@/lib/storage/blob";

export async function getActor(): Promise<
  { actor: BerkasActor } | { response: NextResponse }
> {
  try {
    const user = await requireUser();
    return {
      actor: {
        id: user.id,
        role: user.role,
        status: user.status,
        nip: user.nip,
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
  if (error instanceof BerkasForbiddenError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 403 },
    );
  }
  if (error instanceof BerkasNotFoundError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 404 },
    );
  }
  if (error instanceof BerkasConflictError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 409 },
    );
  }
  if (error instanceof BerkasValidationError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 400 },
    );
  }
  if (error instanceof BerkasPdfError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 500 },
    );
  }
  if (error instanceof BlobStorageNotConfiguredError) {
    return NextResponse.json(
      { error: { message: "Layanan penyimpanan file belum dikonfigurasi." } },
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
    { error: { message: "ID Berkas tidak valid" } },
    { status: 400 },
  );
}
