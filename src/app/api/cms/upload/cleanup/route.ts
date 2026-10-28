import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  getPermittedActor,
  mapPermissionError,
} from "@/lib/auth/require-permission";
import { deleteCmsImageIfUnreferenced } from "@/lib/cms/image-storage";
import {
  PublicImageStorageNotConfiguredError,
  PublicImageStorageUnavailableError,
} from "@/lib/storage/public-image";

// Orphan upload cleanup — ADMIN ONLY (CMS_MANAGE).
//
// Narrow on purpose: the caller names ONE CMS storage pathname, the server
// re-validates it against the namespace and refuses to delete anything a CMS
// record still references. There is no generic blob-delete surface exposed to
// the browser.
//
// Used when the browser uploaded an image but the following metadata save
// failed, so the new object would otherwise be orphaned.

const cleanupBodySchema = z.object({
  pathname: z.string().trim().min(1).max(300),
});

export async function POST(request: Request) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
    if ("response" in auth) return auth.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { message: "Body harus berupa JSON yang valid" } },
        { status: 400 },
      );
    }

    const parsed = cleanupBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            message: "Validasi gagal",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    const result = await deleteCmsImageIfUnreferenced(parsed.data.pathname);
    if (result.reason === "rejected") {
      // Outside the CMS image namespace: never a valid cleanup target.
      return NextResponse.json(
        { error: { message: "Lokasi file gambar tidak valid." } },
        { status: 400 },
      );
    }
    return NextResponse.json({ data: result }, { status: 200 });
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
    console.error("POST /api/cms/upload/cleanup failed", error);
    return NextResponse.json(
      { error: { message: "Gagal menghapus gambar upload." } },
      { status: 500 },
    );
  }
}
