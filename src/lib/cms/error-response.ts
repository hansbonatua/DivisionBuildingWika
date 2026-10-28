import { NextResponse } from "next/server";
import { CmsImageValidationError } from "@/lib/cms/image-storage";
import {
  PublicImageStorageNotConfiguredError,
  PublicImageStorageUnavailableError,
} from "@/lib/storage/public-image";

// HTTP mapping for CMS image failures, shared by every CMS management route so
// a storage problem can never surface as an opaque 500.
//
// Returns null for unrelated errors so callers keep their own handling.

export function mapCmsImageError(error: unknown): NextResponse | null {
  if (error instanceof CmsImageValidationError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 400 },
    );
  }
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
  return null;
}
