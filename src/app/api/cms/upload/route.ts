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
import { isCmsUploadPathname } from "@/lib/cms/storage-path";
import {
  PublicImageStorageNotConfiguredError,
  PublicImageStorageUnavailableError,
  isPublicImageStorageConfigured,
  resolveCmsBlobReadWriteToken,
} from "@/lib/storage/public-image";

// CMS public-image client-upload token route — ADMIN ONLY (CMS_MANAGE).
//
// The bytes never pass through this function: the browser asks for an
// authorization token here, then uploads directly to the PUBLIC CMS store
// (bdwika-cms). The record itself is written afterwards through the module API,
// which re-verifies the stored object before anything reaches the database.
//
// The token is always signed with CMS_BLOB_READ_WRITE_TOKEN. It must never fall
// back to `BLOB_READ_WRITE_TOKEN`, which belongs to the PRIVATE Template & Form
// document store: a fallback would silently upload landing images into the
// documents namespace.
//
// Authorized namespaces: `cms/hero/` (Phase A), `cms/projects/` and
// `cms/green-building/` (Phase B), `cms/clients/` (Phase C), `cms/social/`
// (Phase D). Any other `cms/*` path, every `template-form/*` path and any
// unrelated prefix stay rejected. The route contract (Admin only, public
// access, 5 MB, image allowlist, CMS token, no overwrite) is unchanged.

const PATHNAME_REJECTED_MESSAGE =
  "Lokasi file gambar tidak valid. Unggah ulang gambar dengan format yang didukung.";

class UploadPathRejectedError extends Error {
  constructor() {
    super(PATHNAME_REJECTED_MESSAGE);
    this.name = "UploadPathRejectedError";
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
    if ("response" in auth) return auth.response;

    const token = resolveCmsBlobReadWriteToken();
    if (!token || !isPublicImageStorageConfigured()) {
      return NextResponse.json(
        { error: { message: "Penyimpanan gambar belum dikonfigurasi." } },
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
      // Explicit CMS credential: no BLOB_READ_WRITE_TOKEN fallback.
      token,
      onBeforeGenerateToken: async (pathname) => {
        if (!isCmsUploadPathname(pathname)) {
          throw new UploadPathRejectedError();
        }
        return {
          allowedContentTypes: [...CMS_IMAGE_UPLOAD_ALLOWED_CONTENT_TYPES],
          maximumSizeInBytes: CMS_IMAGE_MAX_BYTES,
          addRandomSuffix: false,
          allowOverwrite: false,
          // Immutable per-upload pathname ⇒ the object bytes never change.
          cacheControlMaxAge: CMS_IMAGE_CACHE_CONTROL_MAX_AGE_SECONDS,
          // Short-lived: the browser uploads immediately after this call.
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof UploadPathRejectedError) {
      return NextResponse.json(
        { error: { message: PATHNAME_REJECTED_MESSAGE } },
        { status: 400 },
      );
    }
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
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
    console.error("POST /api/cms/upload failed", error);
    return NextResponse.json(
      { error: { message: "Gagal menyiapkan proses upload gambar." } },
      { status: 500 },
    );
  }
}
