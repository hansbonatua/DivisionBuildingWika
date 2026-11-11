import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  getPermittedActor,
  mapPermissionError,
} from "@/lib/auth/require-permission";
import {
  getProjectPhotos,
  saveProjectPhotos,
  saveProjectPhotosSchema,
  SasaaConflictError,
  SasaaForbiddenError,
  SasaaNotFoundError,
  SasaaValidationError,
} from "@/lib/dashboard/sasaa-service";
import {
  PublicImageStorageNotConfiguredError,
  PublicImageStorageUnavailableError,
} from "@/lib/storage/public-image";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ id: string }> };

function noStore(data: unknown, status = 200) {
  return NextResponse.json(
    { data },
    {
      status,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

function mapDomainError(error: unknown): NextResponse | null {
  if (error instanceof SasaaForbiddenError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 403 },
    );
  }
  if (error instanceof SasaaNotFoundError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 404 },
    );
  }
  if (error instanceof SasaaValidationError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 400 },
    );
  }
  if (error instanceof SasaaConflictError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 409 },
    );
  }
  if (error instanceof PublicImageStorageNotConfiguredError) {
    return NextResponse.json(
      { error: { message: "Penyimpanan gambar belum dikonfigurasi." } },
      { status: 503 },
    );
  }
  if (error instanceof PublicImageStorageUnavailableError) {
    return NextResponse.json(
      { error: { message: "Penyimpanan gambar sedang tidak tersedia." } },
      { status: 502 },
    );
  }
  return mapPermissionError(error);
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.MASTER_PROJECT_PHOTOS_MANAGE);
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json(
        { error: { message: "ID Master Project tidak valid" } },
        { status: 400 },
      );
    }

    const data = await getProjectPhotos(id);
    if (!data) {
      return NextResponse.json(
        { error: { message: "Master Project tidak ditemukan" } },
        { status: 404 },
      );
    }
    return noStore(data);
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/master-project/[id]/photos failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.MASTER_PROJECT_PHOTOS_MANAGE);
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json(
        { error: { message: "ID Master Project tidak valid" } },
        { status: 400 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { message: "Body harus berupa JSON yang valid" } },
        { status: 400 },
      );
    }

    const parsed = saveProjectPhotosSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            message: "Validasi gagal",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    const data = await saveProjectPhotos(
      { id: auth.actor.id, role: auth.actor.role, status: auth.actor.status },
      id,
      parsed.data.photos,
    );
    return noStore(data);
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("PUT /api/master-project/[id]/photos failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
