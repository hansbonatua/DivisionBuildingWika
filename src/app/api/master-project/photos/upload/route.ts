import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  getPermittedActor,
  mapPermissionError,
} from "@/lib/auth/require-permission";
import {
  CMS_IMAGE_MAX_BYTES,
  isCmsImageContentType,
} from "@/lib/cms/image-source";
import { parseProjectPhotoPathname } from "@/lib/dashboard/project-photo-storage";
import { getMasterProjectById } from "@/lib/master-project/repository";
import {
  PublicImageStorageNotConfiguredError,
  PublicImageStorageUnavailableError,
  headPublicCmsImage,
  isPublicImageStorageConfigured,
} from "@/lib/storage/public-image";
import {
  contentTypeRejected,
  createUploadTicket,
  declaredSizeRejected,
  readUploadTicketRequest,
  uploadRequestRejected,
} from "@/lib/storage/upload-presign";

// SASAA project-photo upload ticket route.
//
// The browser uploads straight to the PUBLIC bucket; this route only proves the
// caller may write the requested slot of the requested project and mints a
// short-lived presigned PUT for that exact pathname.

const STORAGE_NOT_CONFIGURED = "Penyimpanan gambar belum dikonfigurasi.";
const PATH_REJECTED =
  "Lokasi atau data foto proyek tidak valid. Unggah ulang foto.";
const SIZE_REJECTED = "Ukuran foto proyek melebihi batas 5 MB.";
const CONTENT_TYPE_REJECTED =
  "Tipe file foto proyek tidak didukung. Gunakan JPG, PNG, WEBP, atau AVIF.";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class UploadProjectNotFoundError extends Error {
  constructor() {
    super("Master Project tidak ditemukan");
    this.name = "UploadProjectNotFoundError";
  }
}

function parseProjectPayload(
  raw: Record<string, unknown> | null,
): { projectId: string; slot: number } | null {
  if (!raw) return null;
  const { projectId, slot } = raw;
  if (
    typeof projectId !== "string" ||
    !UUID_RE.test(projectId) ||
    typeof slot !== "number" ||
    !Number.isInteger(slot) ||
    slot < 1 ||
    slot > 4
  ) {
    return null;
  }
  return { projectId, slot };
}

export async function POST(request: Request) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.MASTER_PROJECT_PHOTOS_MANAGE);
    if ("response" in auth) return auth.response;

    if (!isPublicImageStorageConfigured()) {
      return NextResponse.json(
        { error: { message: STORAGE_NOT_CONFIGURED } },
        { status: 503 },
      );
    }

    const body = await readUploadTicketRequest(request);
    if (!body) return uploadRequestRejected("Permintaan upload tidak valid");

    const parsedPath = parseProjectPhotoPathname(body.pathname);
    const payload = parseProjectPayload(body.clientPayload);
    if (
      !parsedPath ||
      !payload ||
      parsedPath.projectId !== payload.projectId ||
      parsedPath.slot !== payload.slot
    ) {
      return uploadRequestRejected(PATH_REJECTED);
    }
    if (!isCmsImageContentType(body.contentType)) {
      return contentTypeRejected(CONTENT_TYPE_REJECTED);
    }
    if (body.sizeBytes > CMS_IMAGE_MAX_BYTES) {
      return declaredSizeRejected(SIZE_REJECTED);
    }

    const project = await getMasterProjectById(payload.projectId);
    if (!project) {
      throw new UploadProjectNotFoundError();
    }

    return await createUploadTicket({
      visibility: "public",
      pathname: body.pathname,
      contentType: body.contentType,
      alreadyExists: (await headPublicCmsImage(body.pathname)) !== null,
    });
  } catch (error) {
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
