import { NextResponse } from "next/server";
import {
  isTemplateFormManageError,
  requireTemplateFormManageActor,
} from "@/app/api/template-form/upload/_guard";
import {
  TEMPLATE_FORM_MAX_FILE_SIZE_BYTES,
  TEMPLATE_FORM_UPLOAD_ALLOWED_CONTENT_TYPES,
} from "@/lib/template-form/source";
import { isValidTemplateFormBlobPathname } from "@/lib/template-form/storage-path";
import { headBlob, isBlobClientUploadConfigured } from "@/lib/storage/blob";
import {
  contentTypeRejected,
  createUploadTicket,
  declaredSizeRejected,
  readUploadTicketRequest,
  uploadRequestRejected,
} from "@/lib/storage/upload-presign";
import { mapDomainError } from "../_helpers";

// Template & Form upload ticket route.
//
// The bytes never pass through this function: the browser asks for a presigned
// PUT here, uploads straight to the PRIVATE bucket. The ticket is constrained
// server-side to the Template & Form namespace, the approved content types and
// the 50 MiB limit.
//
// The record itself is created afterwards through POST /api/template-form,
// where the stored object is verified again (existence, size, content type)
// before anything is written to the database.

const PATHNAME_REJECTED_MESSAGE =
  "Nama atau lokasi file tidak valid. Gunakan format file yang didukung.";
const SIZE_REJECTED_MESSAGE = "Ukuran file maksimal 50 MB.";
const CONTENT_TYPE_REJECTED_MESSAGE =
  "Tipe file tidak didukung. Gunakan PDF, Word, Excel, atau PowerPoint.";

function normalizeContentType(value: string): string {
  return value.split(";")[0]?.trim().toLowerCase() ?? "";
}

export async function POST(request: Request) {
  try {
    const auth = await requireTemplateFormManageActor();
    if ("response" in auth) return auth.response;

    if (!isBlobClientUploadConfigured()) {
      return NextResponse.json(
        { error: { message: "Layanan penyimpanan file belum dikonfigurasi." } },
        { status: 503 },
      );
    }

    const body = await readUploadTicketRequest(request);
    if (!body) return uploadRequestRejected("Permintaan upload tidak valid");

    if (!isValidTemplateFormBlobPathname(body.pathname)) {
      return uploadRequestRejected(PATHNAME_REJECTED_MESSAGE);
    }

    const contentType = normalizeContentType(body.contentType);
    if (
      !(TEMPLATE_FORM_UPLOAD_ALLOWED_CONTENT_TYPES as readonly string[]).includes(
        contentType,
      )
    ) {
      return contentTypeRejected(CONTENT_TYPE_REJECTED_MESSAGE);
    }
    if (body.sizeBytes > TEMPLATE_FORM_MAX_FILE_SIZE_BYTES) {
      return declaredSizeRejected(SIZE_REJECTED_MESSAGE);
    }

    return await createUploadTicket({
      visibility: "private",
      pathname: body.pathname,
      contentType,
      alreadyExists: (await headBlob(body.pathname)) !== null,
    });
  } catch (error) {
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
