import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  learningUploadClientPayloadSchema,
  type LearningUploadClientPayload,
} from "@/lib/learning/schema";
import {
  ensureLearningManage,
  LearningValidationError,
} from "@/lib/learning/service";
import {
  LEARNING_ATTACHMENT_CONTENT_TYPES,
  LEARNING_ATTACHMENT_MAX_BYTES,
  LEARNING_THUMBNAIL_CONTENT_TYPES,
  LEARNING_THUMBNAIL_MAX_BYTES,
  isValidLearningAttachmentPathname,
  isValidLearningThumbnailPathname,
} from "@/lib/learning/storage-path";
import { isBlobClientUploadConfigured } from "@/lib/storage/blob";
import {
  isPublicImageStorageConfigured,
  resolveCmsBlobReadWriteToken,
} from "@/lib/storage/public-image";
import { getActor, handleRouteError } from "../_helpers";

// POST /api/learning/upload-token
//
// One route, two stores. Bytes never pass through this function: the browser
// asks for a short-lived token, uploads directly to Blob, then POST/PATCH
// /api/learning/contents claims the resulting pathname (where the object is
// verified again through head()).
//
//   kind = "thumbnail"  -> PUBLIC CMS store, signed with CMS_BLOB_READ_WRITE_TOKEN
//   kind = "attachment" -> PRIVATE store, default BLOB_READ_WRITE_TOKEN
//
// `kind` is read from `payload.clientPayload` BEFORE signing, because the store
// credential must be chosen up front. The pathname is then re-validated inside
// the callback, so a thumbnail token can never be used for an attachment path.

const THUMBNAIL_CACHE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
const TOKEN_TTL_MS = 10 * 60 * 1000;

const INVALID_UPLOAD_MESSAGE = "Permintaan upload tidak valid";

function parseClientPayload(
  raw: string | null,
): LearningUploadClientPayload | null {
  if (!raw) return null;
  try {
    const parsed = learningUploadClientPayloadSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Reads the raw client payload out of a blob.generate-client-token body. */
function readRawClientPayload(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const payload = (body as { payload?: unknown }).payload;
  if (typeof payload !== "object" || payload === null) return null;
  const value = (payload as { clientPayload?: unknown }).clientPayload;
  return typeof value === "string" ? value : null;
}

export async function POST(request: Request) {
  try {
    const actor = await getActor();
    ensureLearningManage(actor);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new LearningValidationError(INVALID_UPLOAD_MESSAGE);
    }
    if (
      typeof body !== "object" ||
      body === null ||
      typeof (body as { type?: unknown }).type !== "string"
    ) {
      throw new LearningValidationError(INVALID_UPLOAD_MESSAGE);
    }

    const payload = parseClientPayload(readRawClientPayload(body));
    if (!payload) {
      throw new LearningValidationError(INVALID_UPLOAD_MESSAGE);
    }

    let cmsToken: string | null = null;
    if (payload.kind === "thumbnail") {
      cmsToken = resolveCmsBlobReadWriteToken();
      if (!cmsToken || !isPublicImageStorageConfigured()) {
        return NextResponse.json(
          { error: { message: "Penyimpanan gambar belum dikonfigurasi." } },
          { status: 503, headers: { "Cache-Control": "no-store" } },
        );
      }
    } else if (!isBlobClientUploadConfigured()) {
      return NextResponse.json(
        { error: { message: "Layanan penyimpanan file belum dikonfigurasi." } },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const result = await handleUpload({
      request,
      body: body as HandleUploadBody,
      ...(cmsToken ? { token: cmsToken } : {}),
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const inner = parseClientPayload(clientPayload) ?? payload;

        if (inner.kind === "thumbnail") {
          if (!isValidLearningThumbnailPathname(pathname)) {
            throw new LearningValidationError(
              "Lokasi gambar tidak valid. Unggah ulang dengan format yang didukung.",
            );
          }
          return {
            allowedContentTypes: [...LEARNING_THUMBNAIL_CONTENT_TYPES],
            maximumSizeInBytes: LEARNING_THUMBNAIL_MAX_BYTES,
            addRandomSuffix: false,
            allowOverwrite: false,
            // Immutable per-upload pathname => the bytes behind the URL never
            // change, so an aggressive cache is safe.
            cacheControlMaxAge: THUMBNAIL_CACHE_MAX_AGE_SECONDS,
            validUntil: Date.now() + TOKEN_TTL_MS,
          };
        }

        if (!isValidLearningAttachmentPathname(pathname)) {
          throw new LearningValidationError(
            "Lokasi file tidak valid. Unggah ulang dengan format yang didukung.",
          );
        }
        return {
          allowedContentTypes: [...LEARNING_ATTACHMENT_CONTENT_TYPES],
          maximumSizeInBytes: LEARNING_ATTACHMENT_MAX_BYTES,
          addRandomSuffix: false,
          allowOverwrite: false,
          validUntil: Date.now() + TOKEN_TTL_MS,
        };
      },
    });

    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return handleRouteError(error, "POST /api/learning/upload-token");
  }
}
