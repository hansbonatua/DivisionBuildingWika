import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  getPermittedActor,
  mapPermissionError,
} from "@/lib/auth/require-permission";
import {
  CMS_IMAGE_CACHE_CONTROL_MAX_AGE_SECONDS,
  CMS_IMAGE_MAX_BYTES,
  CMS_IMAGE_UPLOAD_ALLOWED_CONTENT_TYPES,
} from "@/lib/cms/image-source";
import { parseProjectPhotoPathname } from "@/lib/dashboard/project-photo-storage";
import { getMasterProjectById } from "@/lib/master-project/repository";
import {
  PublicImageStorageNotConfiguredError,
  PublicImageStorageUnavailableError,
  isPublicImageStorageConfigured,
  resolveCmsBlobReadWriteToken,
} from "@/lib/storage/public-image";

const STORAGE_NOT_CONFIGURED =
  "Penyimpanan gambar belum dikonfigurasi.";
const PATH_REJECTED =
  "Lokasi atau data foto proyek tidak valid. Unggah ulang foto.";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class UploadPathRejectedError extends Error {
  constructor() {
    super(PATH_REJECTED);
    this.name = "UploadPathRejectedError";
  }
}

class UploadProjectNotFoundError extends Error {
  constructor() {
    super("Master Project tidak ditemukan");
    this.name = "UploadProjectNotFoundError";
  }
}

function parseClientPayload(
  raw: unknown,
): { projectId: string; slot: number } | null {
  if (typeof raw !== "string") return null;
  try {
    const value = JSON.parse(raw) as { projectId?: unknown; slot?: unknown };
    if (
      typeof value.projectId !== "string" ||
      !UUID_RE.test(value.projectId) ||
      typeof value.slot !== "number" ||
      !Number.isInteger(value.slot) ||
      value.slot < 1 ||
      value.slot > 4
    ) {
      return null;
    }
    return { projectId: value.projectId, slot: value.slot };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.MASTER_PROJECT_PHOTOS_MANAGE);
    if ("response" in auth) return auth.response;

    const token = resolveCmsBlobReadWriteToken();
    if (!token || !isPublicImageStorageConfigured()) {
      return NextResponse.json(
        { error: { message: STORAGE_NOT_CONFIGURED } },
        { status: 503 },
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
    if (
      typeof body !== "object" ||
      body === null ||
      typeof (body as { type?: unknown }).type !== "string"
    ) {
      return NextResponse.json(
        { error: { message: "Permintaan upload tidak valid" } },
        { status: 400 },
      );
    }

    const result = await handleUpload({
      request,
      body: body as HandleUploadBody,
      token,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const parsedPath = parseProjectPhotoPathname(pathname);
        const payload = parseClientPayload(clientPayload);
        if (
          !parsedPath ||
          !payload ||
          parsedPath.projectId !== payload.projectId ||
          parsedPath.slot !== payload.slot
        ) {
          throw new UploadPathRejectedError();
        }

        const project = await getMasterProjectById(payload.projectId);
        if (!project) {
          throw new UploadProjectNotFoundError();
        }

        return {
          allowedContentTypes: [...CMS_IMAGE_UPLOAD_ALLOWED_CONTENT_TYPES],
          maximumSizeInBytes: CMS_IMAGE_MAX_BYTES,
          addRandomSuffix: false,
          allowOverwrite: false,
          cacheControlMaxAge: CMS_IMAGE_CACHE_CONTROL_MAX_AGE_SECONDS,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof UploadPathRejectedError) {
      return NextResponse.json(
        { error: { message: PATH_REJECTED } },
        { status: 400 },
      );
    }
    if (error instanceof UploadProjectNotFoundError) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 404 },
      );
    }
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    if (error instanceof PublicImageStorageNotConfiguredError) {
      return NextResponse.json(
        { error: { message: STORAGE_NOT_CONFIGURED } },
        { status: 503 },
      );
    }
    if (error instanceof PublicImageStorageUnavailableError) {
      return NextResponse.json(
        { error: { message: "Penyimpanan gambar sedang tidak tersedia." } },
        { status: 502 },
      );
    }
    console.error("POST /api/master-project/photos/upload failed", error);
    return NextResponse.json(
      { error: { message: "Gagal menyiapkan proses upload foto." } },
      { status: 500 },
    );
  }
}
