import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  isValidRegulationBlobPathname,
  REGULATION_MAX_FILE_SIZE_BYTES,
  REGULATION_UPLOAD_ALLOWED_CONTENT_TYPES,
} from "@/lib/regulation/storage";
import {
  ensureRegulationManage,
  RegulationValidationError,
} from "@/lib/regulation/service";
import { isBlobClientUploadConfigured } from "@/lib/storage/blob";
import {
  getActor,
  handleRouteError,
} from "../_helpers";

// POST /api/regulation/upload
//
// Mints a short-lived token for a direct browser -> Private Blob upload. File
// bytes never pass through this function. The document row is created later by
// POST /sub-kategori/[id]/document, where the stored object is verified.
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new RegulationValidationError(
        "Permintaan upload tidak valid",
      );
    }
    if (
      typeof body !== "object" ||
      body === null ||
      typeof (body as { type?: unknown }).type !== "string"
    ) {
      throw new RegulationValidationError("Permintaan upload tidak valid");
    }

    const result = await handleUpload({
      request,
      body: body as HandleUploadBody,
      onBeforeGenerateToken: async (pathname) => {
        if (!isValidRegulationBlobPathname(pathname)) {
          throw new RegulationValidationError(
            "Nama atau lokasi file tidak valid. Gunakan format file yang didukung.",
          );
        }
        return {
          allowedContentTypes: [
            ...REGULATION_UPLOAD_ALLOWED_CONTENT_TYPES,
          ],
          maximumSizeInBytes: REGULATION_MAX_FILE_SIZE_BYTES,
          addRandomSuffix: false,
          allowOverwrite: false,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
    });

    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/regulation/upload failed",
    );
  }
}
