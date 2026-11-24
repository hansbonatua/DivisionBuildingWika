import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
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
  isPublicImageStorageConfigured,
  resolveCmsBlobReadWriteToken,
} from "@/lib/storage/public-image";

// User profile-photo client-upload token route.
//
// The bytes never pass through this function: the browser asks for an
// authorization token here, then uploads directly to the PUBLIC image store.
// The photo URL is written afterwards through PATCH /api/users/[id] or
// PATCH /api/auth/me, which re-verifies the stored object before it reaches the
// database.
//
// Authorization: the authenticated user may upload for THEMSELVES
// (actor.id === payload.userId); an Admin (USER_MANAGE) may upload for any
// user. The pathname must belong to the same user id, so a token can never be
// minted for another account's namespace.

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STORAGE_NOT_CONFIGURED = "Penyimpanan gambar belum dikonfigurasi.";
const PATH_REJECTED =
  "Lokasi foto profil tidak valid. Unggah ulang foto.";
const FORBIDDEN = "Anda tidak memiliki izin mengganti foto user ini.";

class UploadPathRejectedError extends Error {
  constructor() {
    super(PATH_REJECTED);
    this.name = "UploadPathRejectedError";
  }
}

class UploadForbiddenError extends Error {
  constructor() {
    super(FORBIDDEN);
    this.name = "UploadForbiddenError";
  }
}

function parseClientPayload(raw: string | null | undefined): { userId: string } | null {
  if (typeof raw !== "string") return null;
  try {
    const value = JSON.parse(raw) as { userId?: unknown };
    if (typeof value.userId !== "string" || !UUID_RE.test(value.userId)) {
      return null;
    }
    return { userId: value.userId };
  } catch {
    return null;
  }
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
        const payload = parseClientPayload(clientPayload);
        if (!payload) {
          throw new UploadPathRejectedError();
        }

        const isSelf = actor.id === payload.userId;
        if (!isSelf && !hasPermission(actor.role, PERMISSIONS.USER_MANAGE)) {
          throw new UploadForbiddenError();
        }

        const parsedPath = parseUserPhotoPathname(pathname);
        if (!parsedPath || parsedPath.userId !== payload.userId) {
          throw new UploadPathRejectedError();
        }

        return {
          allowedContentTypes: [...USER_PHOTO_ALLOWED_TYPES],
          maximumSizeInBytes: USER_PHOTO_MAX_BYTES,
          addRandomSuffix: false,
          allowOverwrite: false,
          // Short-lived: the browser uploads immediately after this call.
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
