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
import { isCmsUploadPathname } from "@/lib/cms/storage-path";
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

// CMS public-image upload ticket route — ADMIN ONLY (CMS_MANAGE).
//
// The bytes never pass through this function: the browser asks for a presigned
// PUT here, uploads straight to the PUBLIC bucket, then the module API claims
// the pathname and re-verifies the stored object before anything reaches the
// database.
//
// Authorized namespaces: `cms/hero/`, `cms/projects/`, `cms/green-building/`,
// `cms/clients/`, `cms/social/`, `cms/organization/` and `cms/learning/`. Any
// other `cms/*` path, every `template-form/*` path and any unrelated prefix stay
// rejected. The route contract (Admin only, public bucket, 5 MB, image
// allowlist, no overwrite) is unchanged.

const PATHNAME_REJECTED_MESSAGE =
  "Lokasi file gambar tidak valid. Unggah ulang gambar dengan format yang didukung.";
const SIZE_REJECTED_MESSAGE = "Ukuran gambar melebihi batas 5 MB.";
const CONTENT_TYPE_REJECTED_MESSAGE =
  "Tipe file gambar tidak didukung. Gunakan JPG, PNG, WEBP, atau AVIF.";

export async function POST(request: Request) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
    if ("response" in auth) return auth.response;

    if (!isPublicImageStorageConfigured()) {
      return NextResponse.json(
        { error: { message: "Penyimpanan gambar belum dikonfigurasi." } },
        { status: 503 },
      );
    }

    const body = await readUploadTicketRequest(request);
    if (!body) return uploadRequestRejected("Permintaan upload tidak valid");

    if (!isCmsUploadPathname(body.pathname)) {
      return uploadRequestRejected(PATHNAME_REJECTED_MESSAGE);
    }
    if (!isCmsImageContentType(body.contentType)) {
      return contentTypeRejected(CONTENT_TYPE_REJECTED_MESSAGE);
    }
    if (body.sizeBytes > CMS_IMAGE_MAX_BYTES) {
      return declaredSizeRejected(SIZE_REJECTED_MESSAGE);
    }

    return await createUploadTicket({
      visibility: "public",
      pathname: body.pathname,
      contentType: body.contentType,
      alreadyExists: (await headPublicCmsImage(body.pathname)) !== null,
    });
  } catch (error) {
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
