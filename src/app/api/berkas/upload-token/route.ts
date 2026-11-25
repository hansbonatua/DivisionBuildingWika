import { NextResponse } from "next/server";
import { canValidateBerkas } from "@/lib/berkas/access";
import {
  berkasUploadClientPayloadSchema,
  type BerkasUploadClientPayload,
} from "@/lib/berkas/schema";
import {
  BerkasForbiddenError,
  ensureBerkasCreate,
  ensureBerkasValidatorUpload,
} from "@/lib/berkas/service";
import {
  isValidBerkasUploadPathname,
  parseBerkasValidationTtdPathname,
} from "@/lib/berkas/storage-path";
import { headBlob, isBlobClientUploadConfigured } from "@/lib/storage/blob";
import {
  contentTypeRejected,
  createUploadTicket,
  declaredSizeRejected,
  readUploadTicketRequest,
  uploadRequestRejected,
} from "@/lib/storage/upload-presign";
import { getActor, mapDomainError } from "../_helpers";

// Berkas upload ticket route.
//
// Bytes never pass through this function. The browser requests a presigned PUT,
// uploads straight to the PRIVATE bucket, then POST /api/berkas claims the
// resulting pathname. The ticket is constrained to the actor's upload
// namespace, the approved content types, and the 20 MB PDF / 2 MB TTD limits.

const PDF_MAX_BYTES = 20 * 1024 * 1024;
const TTD_MAX_BYTES = 2 * 1024 * 1024;

const PDF_CONTENT_TYPE = "application/pdf";
const TTD_CONTENT_TYPES = ["image/png", "image/jpeg"] as const;

class BerkasUploadPayloadError extends Error {
  constructor(message = "Permintaan upload Berkas tidak valid") {
    super(message);
    this.name = "BerkasUploadPayloadError";
  }
}

function normalizeContentType(value: string): string {
  return value.split(";")[0]?.trim().toLowerCase() ?? "";
}

function parsePayload(
  raw: Record<string, unknown> | null,
): BerkasUploadClientPayload | null {
  if (!raw) return null;
  const parsed = berkasUploadClientPayloadSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function POST(request: Request) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    if (!isBlobClientUploadConfigured()) {
      return NextResponse.json(
        { error: { message: "Layanan penyimpanan file belum dikonfigurasi." } },
        { status: 503 },
      );
    }

    const body = await readUploadTicketRequest(request);
    if (!body) return uploadRequestRejected("Permintaan upload tidak valid");

    try {
      const payload = parsePayload(body.clientPayload);
      if (!payload) {
        throw new BerkasUploadPayloadError();
      }
      const contentType = normalizeContentType(body.contentType);

      if (payload.kind === "validator_ttd") {
        if (!payload.berkasId || !payload.role) {
          throw new BerkasUploadPayloadError();
        }
        if (!canValidateBerkas(auth.actor.role)) {
          throw new BerkasForbiddenError(
            "Anda tidak memiliki akses validasi Berkas",
          );
        }
        const expectedRole = payload.role === "validasi-1" ? "1" : "2";
        const parsedPath = parseBerkasValidationTtdPathname(body.pathname);
        if (
          !parsedPath ||
          parsedPath.berkasId !== payload.berkasId ||
          parsedPath.role !== expectedRole
        ) {
          throw new BerkasUploadPayloadError(
            "Nama atau lokasi file tidak valid",
          );
        }
        if (!(TTD_CONTENT_TYPES as readonly string[]).includes(contentType)) {
          return contentTypeRejected(
            "Tipe file TTD harus PNG atau JPEG.",
          );
        }
        if (body.sizeBytes > TTD_MAX_BYTES) {
          return declaredSizeRejected("Ukuran TTD maksimal 2 MB.");
        }
        await ensureBerkasValidatorUpload(
          auth.actor,
          payload.berkasId,
          payload.role,
        );
        return await createUploadTicket({
          visibility: "private",
          pathname: body.pathname,
          contentType,
          alreadyExists: (await headBlob(body.pathname)) !== null,
        });
      }

      ensureBerkasCreate(auth.actor);
      if (!payload.uploadId) {
        throw new BerkasUploadPayloadError();
      }

      const valid =
        payload.kind === "original"
          ? isValidBerkasUploadPathname(
              body.pathname,
              auth.actor.id,
              payload.uploadId,
              "original",
            )
          : isValidBerkasUploadPathname(
              body.pathname,
              auth.actor.id,
              payload.uploadId,
              "penyusun_ttd",
              payload.urutan ?? 0,
            );

      if (!valid) {
        throw new BerkasUploadPayloadError(
          "Nama atau lokasi file tidak valid",
        );
      }

      if (payload.kind === "original") {
        if (contentType !== PDF_CONTENT_TYPE) {
          return contentTypeRejected("File berkas harus berupa PDF.");
        }
        if (body.sizeBytes > PDF_MAX_BYTES) {
          return declaredSizeRejected("Ukuran PDF maksimal 20 MB.");
        }
      } else {
        if (!(TTD_CONTENT_TYPES as readonly string[]).includes(contentType)) {
          return contentTypeRejected("Tipe file TTD harus PNG atau JPEG.");
        }
        if (body.sizeBytes > TTD_MAX_BYTES) {
          return declaredSizeRejected("Ukuran TTD maksimal 2 MB.");
        }
      }

      return await createUploadTicket({
        visibility: "private",
        pathname: body.pathname,
        contentType,
        alreadyExists: (await headBlob(body.pathname)) !== null,
      });
    } catch (error) {
      if (error instanceof BerkasUploadPayloadError) {
        return uploadRequestRejected(error.message);
      }
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("POST /api/berkas/upload-token failed", error);
    return NextResponse.json(
      { error: { message: "Gagal menyiapkan proses upload." } },
      { status: 500 },
    );
  }
}
