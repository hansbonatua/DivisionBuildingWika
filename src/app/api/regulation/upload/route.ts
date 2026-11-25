import { NextResponse } from "next/server";
import {
  isValidRegulationBlobPathname,
  REGULATION_MAX_FILE_SIZE_BYTES,
  REGULATION_UPLOAD_ALLOWED_CONTENT_TYPES,
} from "@/lib/regulation/storage";
import {
  ensureRegulationManage,
  RegulationValidationError,
} from "@/lib/regulation/service";
import { headBlob, isBlobClientUploadConfigured } from "@/lib/storage/blob";
import {
  contentTypeRejected,
  createUploadTicket,
  declaredSizeRejected,
  readUploadTicketRequest,
  uploadRequestRejected,
} from "@/lib/storage/upload-presign";
import { getActor, handleRouteError } from "../_helpers";

// POST /api/regulation/upload
//
// Mints a short-lived presigned PUT for a direct browser -> PRIVATE bucket
// upload. File bytes never pass through this function. The document row is
// created later by POST /sub-kategori/[id]/document, where the stored object is
// verified again.

const SIZE_REJECTED_MESSAGE = "Ukuran file maksimal 20 MB.";
const CONTENT_TYPE_REJECTED_MESSAGE =
  "Tipe file tidak didukung. Gunakan PDF, Word, Excel, atau ZIP.";

function normalizeContentType(value: string): string {
  return value.split(";")[0]?.trim().toLowerCase() ?? "";
}

export async function POST(request: Request) {
  try {
    const actor = await getActor();
    ensureRegulationManage(actor);

    if (!isBlobClientUploadConfigured()) {
      return NextResponse.json(
        { error: { message: "Layanan penyimpanan file belum dikonfigurasi." } },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const body = await readUploadTicketRequest(request);
    if (!body) {
      throw new RegulationValidationError("Permintaan upload tidak valid");
    }

    if (!isValidRegulationBlobPathname(body.pathname)) {
      return uploadRequestRejected(
        "Nama atau lokasi file tidak valid. Gunakan format file yang didukung.",
      );
    }

    const contentType = normalizeContentType(body.contentType);
    if (
      !(REGULATION_UPLOAD_ALLOWED_CONTENT_TYPES as readonly string[]).includes(
        contentType,
      )
    ) {
      return contentTypeRejected(CONTENT_TYPE_REJECTED_MESSAGE);
    }
    if (body.sizeBytes > REGULATION_MAX_FILE_SIZE_BYTES) {
      return declaredSizeRejected(SIZE_REJECTED_MESSAGE);
    }

    return await createUploadTicket({
      visibility: "private",
      pathname: body.pathname,
      contentType,
      alreadyExists: (await headBlob(body.pathname)) !== null,
    });
  } catch (error) {
    return handleRouteError(error, "POST /api/regulation/upload failed");
  }
}
