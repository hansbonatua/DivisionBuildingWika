import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
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
import { isBlobClientUploadConfigured } from "@/lib/storage/blob";
import { getActor, mapDomainError, parseJsonBody } from "../_helpers";

// Vercel Blob client-upload token route for Berkas.
//
// Bytes never pass through this function. The browser requests a short-lived
// token, uploads directly to the PRIVATE store, then POST /api/berkas claims the
// resulting pathname. The token is constrained to the actor's upload namespace,
// the approved content types, and the 20 MB PDF / 2 MB TTD limits.

const PDF_MAX_BYTES = 20 * 1024 * 1024;
const TTD_MAX_BYTES = 2 * 1024 * 1024;

class BerkasUploadPayloadError extends Error {
  constructor(message = "Permintaan upload Berkas tidak valid") {
    super(message);
    this.name = "BerkasUploadPayloadError";
  }
}

function parseClientPayload(
  raw: string | null,
): BerkasUploadClientPayload | null {
  if (!raw) return null;
  try {
    const parsed = berkasUploadClientPayloadSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
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

    try {
      const result = await handleUpload({
        request,
        body: body as HandleUploadBody,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          const payload = parseClientPayload(clientPayload);
          if (!payload) {
            throw new BerkasUploadPayloadError();
          }

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
            const parsedPath = parseBerkasValidationTtdPathname(pathname);
            if (
              !parsedPath ||
              parsedPath.berkasId !== payload.berkasId ||
              parsedPath.role !== expectedRole
            ) {
              throw new BerkasUploadPayloadError(
                "Nama atau lokasi file tidak valid",
              );
            }
            await ensureBerkasValidatorUpload(
              auth.actor,
              payload.berkasId,
              payload.role,
            );
            return {
              allowedContentTypes: ["image/png", "image/jpeg"],
              maximumSizeInBytes: TTD_MAX_BYTES,
              addRandomSuffix: false,
              allowOverwrite: false,
              validUntil: Date.now() + 10 * 60 * 1000,
            };
          }

          ensureBerkasCreate(auth.actor);
          if (!payload.uploadId) {
            throw new BerkasUploadPayloadError();
          }

          const valid =
            payload.kind === "original"
              ? isValidBerkasUploadPathname(
                  pathname,
                  auth.actor.id,
                  payload.uploadId,
                  "original",
                )
              : isValidBerkasUploadPathname(
                  pathname,
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

          return {
            allowedContentTypes:
              payload.kind === "original"
                ? ["application/pdf"]
                : ["image/png", "image/jpeg"],
            maximumSizeInBytes:
              payload.kind === "original" ? PDF_MAX_BYTES : TTD_MAX_BYTES,
            addRandomSuffix: false,
            allowOverwrite: false,
            validUntil: Date.now() + 10 * 60 * 1000,
          };
        },
      });

      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      if (error instanceof BerkasUploadPayloadError) {
        return NextResponse.json(
          { error: { message: error.message } },
          { status: 400 },
        );
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
