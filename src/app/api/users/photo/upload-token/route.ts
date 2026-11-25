import { NextResponse } from "next/server";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import {
  requireUser,
  UnauthenticatedError,
  type SafeUser,
} from "@/lib/auth/current-user";
import {
  USER_PHOTO_ALLOWED_TYPES,
  USER_PHOTO_MAX_BYTES,
  parseUserPhotoPathname,
} from "@/lib/users/photo-storage";
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

// User profile-photo upload ticket route.
//
// The bytes never pass through this function: the browser asks for a presigned
// PUT here, uploads straight to the PUBLIC bucket. The photo URL is written
// afterwards through PATCH /api/users/[id] or PATCH /api/auth/me, which
// re-verifies the stored object before it reaches the database.
//
// Authorization: the authenticated user may upload for THEMSELVES
// (actor.id === payload.userId); an Admin (USER_MANAGE) may upload for any
// user. The pathname must belong to the same user id, so a ticket can never be
// minted for another account's namespace.

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STORAGE_NOT_CONFIGURED = "Penyimpanan gambar belum dikonfigurasi.";
const PATH_REJECTED = "Lokasi foto profil tidak valid. Unggah ulang foto.";
const FORBIDDEN = "Anda tidak memiliki izin mengganti foto user ini.";
const SIZE_REJECTED = "Ukuran foto profil maksimal 2 MB.";
const CONTENT_TYPE_REJECTED =
  "Format foto profil harus JPG, PNG, atau WEBP.";

class UploadForbiddenError extends Error {
  constructor() {
    super(FORBIDDEN);
    this.name = "UploadForbiddenError";
  }
}

function normalizeContentType(value: string): string {
  return value.split(";")[0]?.trim().toLowerCase() ?? "";
}

function parseUserIdPayload(
  raw: Record<string, unknown> | null,
): { userId: string } | null {
  if (!raw) return null;
  const userId = raw.userId;
  if (typeof userId !== "string" || !UUID_RE.test(userId)) return null;
  return { userId };
}

export async function POST(request: Request) {
  try {
    let actor: SafeUser;
    try {
      actor = await requireUser();
    } catch (error) {
      if (error instanceof UnauthenticatedError) {
        return NextResponse.json(
          { error: { message: "Unauthenticated" } },
          { status: 401 },
        );
      }
      throw error;
    }

    if (!isPublicImageStorageConfigured()) {
      return NextResponse.json(
        { error: { message: STORAGE_NOT_CONFIGURED } },
        { status: 503 },
      );
    }

    const body = await readUploadTicketRequest(request);
    if (!body) return uploadRequestRejected("Permintaan upload tidak valid");

    const payload = parseUserIdPayload(body.clientPayload);
    if (!payload) return uploadRequestRejected(PATH_REJECTED);

    const isSelf = actor.id === payload.userId;
    if (!isSelf && !hasPermission(actor.role, PERMISSIONS.USER_MANAGE)) {
      throw new UploadForbiddenError();
    }

    const parsedPath = parseUserPhotoPathname(body.pathname);
    if (!parsedPath || parsedPath.userId !== payload.userId) {
      return uploadRequestRejected(PATH_REJECTED);
    }

    const contentType = normalizeContentType(body.contentType);
    if (!(USER_PHOTO_ALLOWED_TYPES as readonly string[]).includes(contentType)) {
      return contentTypeRejected(CONTENT_TYPE_REJECTED);
    }
    if (body.sizeBytes > USER_PHOTO_MAX_BYTES) {
      return declaredSizeRejected(SIZE_REJECTED);
    }

    return await createUploadTicket({
      visibility: "public",
      pathname: body.pathname,
      contentType,
      alreadyExists: (await headPublicCmsImage(body.pathname)) !== null,
    });
  } catch (error) {
    if (error instanceof UploadForbiddenError) {
      return NextResponse.json({ error: { message: FORBIDDEN } }, { status: 403 });
    }
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
    console.error("POST /api/users/photo/upload-token failed", error);
    return NextResponse.json(
      { error: { message: "Gagal menyiapkan proses upload foto." } },
      { status: 500 },
    );
  }
}
