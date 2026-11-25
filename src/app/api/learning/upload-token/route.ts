import { NextResponse } from "next/server";
import {
  learningUploadClientPayloadSchema,
  type LearningUploadClientPayload,
} from "@/lib/learning/schema";
import { ensureLearningManage } from "@/lib/learning/service";
import {
  LEARNING_ATTACHMENT_CONTENT_TYPES,
  LEARNING_ATTACHMENT_MAX_BYTES,
  LEARNING_THUMBNAIL_CONTENT_TYPES,
  LEARNING_THUMBNAIL_MAX_BYTES,
  isValidLearningAttachmentPathname,
  isValidLearningThumbnailPathname,
  normalizeMimeType,
} from "@/lib/learning/storage-path";
import { headBlob, isBlobClientUploadConfigured } from "@/lib/storage/blob";
import {
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
import { getActor, handleRouteError } from "../_helpers";

// POST /api/learning/upload-token
//
// One route, two buckets. Bytes never pass through this function: the browser
// asks for a presigned PUT, uploads straight to storage, then POST/PATCH
// /api/learning/contents claims the resulting pathname (where the object is
// verified again through head()).
//
//   kind = "thumbnail"  -> PUBLIC bucket
//   kind = "attachment" -> PRIVATE bucket
//
// `kind` is read from the payload BEFORE signing, because the bucket must be
// chosen up front. The pathname is then validated against that kind, so a
// thumbnail ticket can never be used for an attachment path.

const INVALID_UPLOAD_MESSAGE = "Permintaan upload tidak valid";

function parsePayload(
  raw: Record<string, unknown> | null,
): LearningUploadClientPayload | null {
  if (!raw) return null;
  const parsed = learningUploadClientPayloadSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function POST(request: Request) {
  try {
    const actor = await getActor();
    ensureLearningManage(actor);

    const body = await readUploadTicketRequest(request);
    if (!body) return uploadRequestRejected(INVALID_UPLOAD_MESSAGE);

    const payload = parsePayload(body.clientPayload);
    if (!payload) return uploadRequestRejected(INVALID_UPLOAD_MESSAGE);

    if (payload.kind === "thumbnail") {
      if (!isPublicImageStorageConfigured()) {
        return NextResponse.json(
          { error: { message: "Penyimpanan gambar belum dikonfigurasi." } },
          { status: 503, headers: { "Cache-Control": "no-store" } },
        );
      }
      if (!isValidLearningThumbnailPathname(body.pathname)) {
        return uploadRequestRejected(
          "Lokasi gambar tidak valid. Unggah ulang dengan format yang didukung.",
        );
      }
      const contentType = normalizeMimeType(body.contentType);
      if (
        !(LEARNING_THUMBNAIL_CONTENT_TYPES as readonly string[]).includes(
          contentType,
        )
      ) {
        return contentTypeRejected(
          "Tipe file thumbnail tidak didukung. Gunakan JPG, PNG, atau WEBP.",
        );
      }
      if (body.sizeBytes > LEARNING_THUMBNAIL_MAX_BYTES) {
        return declaredSizeRejected("Ukuran thumbnail maksimal 5 MB.");
      }
      return await createUploadTicket({
        visibility: "public",
        pathname: body.pathname,
        contentType,
        alreadyExists: (await headPublicCmsImage(body.pathname)) !== null,
      });
    }

    if (!isBlobClientUploadConfigured()) {
      return NextResponse.json(
        { error: { message: "Layanan penyimpanan file belum dikonfigurasi." } },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (!isValidLearningAttachmentPathname(body.pathname)) {
      return uploadRequestRejected(
        "Lokasi file tidak valid. Unggah ulang dengan format yang didukung.",
      );
    }
    const contentType = normalizeMimeType(body.contentType);
    if (
      !(LEARNING_ATTACHMENT_CONTENT_TYPES as readonly string[]).includes(
        contentType,
      )
    ) {
      return contentTypeRejected(
        "Tipe file lampiran tidak didukung. Gunakan PDF, Word, Excel, PowerPoint, atau ZIP.",
      );
    }
    if (body.sizeBytes > LEARNING_ATTACHMENT_MAX_BYTES) {
      return declaredSizeRejected("Ukuran lampiran maksimal 20 MB.");
    }
    return await createUploadTicket({
      visibility: "private",
      pathname: body.pathname,
      contentType,
      alreadyExists: (await headBlob(body.pathname)) !== null,
    });
  } catch (error) {
    return handleRouteError(error, "POST /api/learning/upload-token");
  }
}
