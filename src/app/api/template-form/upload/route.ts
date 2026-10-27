import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  isTemplateFormManageError,
  requireTemplateFormManageActor,
} from "@/app/api/template-form/upload/_guard";
import {
  TEMPLATE_FORM_MAX_FILE_SIZE_BYTES,
  TEMPLATE_FORM_UPLOAD_ALLOWED_CONTENT_TYPES,
} from "@/lib/template-form/source";
import { isValidTemplateFormBlobPathname } from "@/lib/template-form/storage-path";
import { isBlobClientUploadConfigured } from "@/lib/storage/blob";
import { mapDomainError, parseJsonBody } from "../_helpers";

// Vercel Blob client-upload token route.
//
// The bytes never pass through this function: the browser asks for an
// authorization token here, then uploads directly to the PRIVATE store. The
// token is constrained server-side to the Template & Form namespace, the
// approved content types and the 50 MiB limit.
//
// The record itself is created afterwards through POST /api/template-form,
// where the stored object is verified again (existence, size, content type)
// before anything is written to the database.

const PATHNAME_REJECTED_MESSAGE =
  "Nama atau lokasi file tidak valid. Gunakan format file yang didukung.";

class UploadPathRejectedError extends Error {
  constructor() {
    super(PATHNAME_REJECTED_MESSAGE);
    this.name = "UploadPathRejectedError";
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireTemplateFormManageActor();
    if ("response" in auth) return auth.response;

    // Requires the read-write token specifically: reading may work with OIDC,
    // but signing a browser upload token cannot.
    if (!isBlobClientUploadConfigured()) {
      return NextResponse.json(
        { error: { message: "Layanan penyimpanan file belum dikonfigurasi." } },
        { status: 503 },
      );
    }

    const parsedBody = await parseJsonBody(request);
    if ("response" in parsedBody) return parsedBody.response;

    const body = parsedBody.body;
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
      onBeforeGenerateToken: async (pathname) => {
        if (!isValidTemplateFormBlobPathname(pathname)) {
          throw new UploadPathRejectedError();
        }
        return {
          allowedContentTypes: [...TEMPLATE_FORM_UPLOAD_ALLOWED_CONTENT_TYPES],
          maximumSizeInBytes: TEMPLATE_FORM_MAX_FILE_SIZE_BYTES,
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
        { error: { message: PATHNAME_REJECTED_MESSAGE } },
        { status: 400 },
      );
    }
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    if (isTemplateFormManageError(error)) {
      return NextResponse.json(
        { error: { message: "Akses Template & Form ditolak" } },
        { status: 403 },
      );
    }
    console.error("POST /api/template-form/upload failed", error);
    return NextResponse.json(
      { error: { message: "Gagal menyiapkan proses upload." } },
      { status: 500 },
    );
  }
}
