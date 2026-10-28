import {
  CMS_IMAGE_MAX_BYTES,
  isCmsImageContentType,
  type CmsImageSourceType,
} from "@/lib/cms/image-source";
import { isCmsImagePathnameReferenced } from "@/lib/cms/image-references";
import {
  cmsBlobPathnameExtension,
  isCmsBlobPathname,
  matchesCmsBlobPathnameUrl,
} from "@/lib/cms/storage-path";
import {
  deletePublicCmsBlob,
  headPublicCmsImage,
} from "@/lib/storage/public-image";

// Ownership + verification rules for CMS public images.
//
// Two separate concerns, both fail-closed:
//
// 1. VERIFY (on write): when a record claims `imageSource: "upload"`, the
//    object is looked up in the CMS store again. The stored URL must be the URL
//    the object actually has, the size must fit the limit and the content type
//    must be an accepted image type. A tampered or stale pathname is rejected
//    instead of being written to the database.
//
// 2. OWN (on delete): an image may only be deleted automatically when the
//    record says it uploaded it AND the stored URL addresses exactly the
//    recorded pathname. Legacy records (no `imageSource`), local `/asset`
//    paths and arbitrary external URLs are never deleted.

export class CmsImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CmsImageValidationError";
  }
}

export type ResolvedCmsImage = {
  imageUrl: string;
  imageSource: CmsImageSourceType;
  blobPathname: string | null;
};

/**
 * Turns an incoming image into the exact trio that will be stored. Shared by
 * every CMS module so upload/external handling can never drift between them.
 *
 * - external: the typed URL / local `/asset` path is kept verbatim and any
 *   supplied pathname is discarded, so an external URL can never carry a
 *   CMS-owned pathname.
 * - upload: the object is looked up in the CMS store again and must exist, fit
 *   the size limit, be an accepted image type and match the submitted URL.
 */
export async function resolveCmsImageForWrite(input: {
  imageUrl: string;
  imageSource?: CmsImageSourceType;
  blobPathname?: string | null;
}): Promise<ResolvedCmsImage> {
  if ((input.imageSource ?? "external") === "external") {
    return {
      imageUrl: input.imageUrl,
      imageSource: "external",
      blobPathname: null,
    };
  }
  const verified = await verifyCmsUploadedImage({
    imageUrl: input.imageUrl,
    blobPathname: input.blobPathname ?? "",
  });
  return {
    imageUrl: verified.imageUrl,
    imageSource: "upload",
    blobPathname: verified.blobPathname,
  };
}

export type VerifiedCmsImage = {
  imageUrl: string;
  blobPathname: string;
};

export type CmsImageDeleteResult = {
  deleted: boolean;
  reason:
    | "deleted"
    | "missing"
    | "referenced"
    | "rejected"
    | "not-configured"
    | "failed";
};

/**
 * Re-verifies an uploaded CMS object before it is persisted.
 *
 * Throws CmsImageValidationError for anything the client could have lied about;
 * storage infrastructure failures propagate as their own typed errors so the
 * route can answer 503/502 instead of blaming the user.
 */
export async function verifyCmsUploadedImage(input: {
  imageUrl: string;
  blobPathname: string;
}): Promise<VerifiedCmsImage> {
  const { imageUrl, blobPathname } = input;

  if (!isCmsBlobPathname(blobPathname)) {
    throw new CmsImageValidationError(
      "Lokasi file gambar tidak valid. Unggah ulang gambar.",
    );
  }
  if (!cmsBlobPathnameExtension(blobPathname)) {
    throw new CmsImageValidationError(
      "Format gambar hasil upload tidak didukung.",
    );
  }

  const metadata = await headPublicCmsImage(blobPathname);
  if (!metadata) {
    throw new CmsImageValidationError(
      "Gambar hasil upload tidak ditemukan. Unggah ulang gambar.",
    );
  }
  if (metadata.size > CMS_IMAGE_MAX_BYTES) {
    throw new CmsImageValidationError("Ukuran gambar melebihi batas 5 MB.");
  }
  if (!isCmsImageContentType(metadata.contentType)) {
    throw new CmsImageValidationError(
      "Tipe file gambar hasil upload tidak didukung.",
    );
  }
  if (metadata.pathname !== blobPathname) {
    throw new CmsImageValidationError("Lokasi file gambar tidak cocok.");
  }
  if (metadata.url !== imageUrl) {
    throw new CmsImageValidationError(
      "URL gambar tidak cocok dengan objek yang tersimpan.",
    );
  }

  return { imageUrl: metadata.url, blobPathname: metadata.pathname };
}

type CmsImageOwningRecord = {
  imageUrl?: string | null;
  imageSource?: string | null;
  blobPathname?: string | null;
};

/**
 * True only when this record owns the stored object behind its image URL.
 *
 * Everything else — legacy record without `imageSource`, external URL, local
 * `/asset` path — is somebody else's asset and must never be deleted.
 */
export function isCmsOwnedImage(record: CmsImageOwningRecord): boolean {
  if (record.imageSource !== "upload") return false;
  const pathname = record.blobPathname;
  if (typeof pathname !== "string" || pathname.length === 0) return false;
  if (!isCmsBlobPathname(pathname)) return false;
  if (typeof record.imageUrl !== "string" || record.imageUrl.length === 0) {
    return false;
  }
  return matchesCmsBlobPathnameUrl(record.imageUrl, pathname);
}

/**
 * Deletes a stored CMS object only when it is inside the CMS namespace and no
 * CMS record references it any more.
 *
 * Storage failures are logged and swallowed: callers run this AFTER the
 * database write succeeded, so a leaked object must never turn a successful
 * save into an error response.
 */
export async function deleteCmsImageIfUnreferenced(
  pathname: string,
): Promise<CmsImageDeleteResult> {
  if (!isCmsBlobPathname(pathname)) {
    return { deleted: false, reason: "rejected" };
  }
  try {
    if (await isCmsImagePathnameReferenced(pathname)) {
      return { deleted: false, reason: "referenced" };
    }
    const result = await deletePublicCmsBlob(pathname);
    return { deleted: result.deleted, reason: result.reason };
  } catch (error) {
    // A reference lookup or storage failure must never be reported as success
    // or silently rewritten into a different reason.
    console.warn(
      `CMS image cleanup failed for pathname "${pathname}"`,
      error instanceof Error ? error.name : "unknown error",
    );
    return { deleted: false, reason: "failed" };
  }
}

export type CmsImageNextState = {
  imageUrl: string;
  imageSource?: string | null;
};

/**
 * Replacement/removal helper: deletes the PREVIOUS image when the record owned
 * it and the new state no longer owns that same object.
 *
 * Ownership ends when the URL changes OR when the record stops being an upload.
 * The second case is the subtle one: switching `upload -> external` keeps the
 * URL the field was seeded with, so a URL-only comparison would treat it as "no
 * change" and keep an object the record has just disowned — after which
 * `blobPathname` is null, the reference registry no longer sees it and the
 * object becomes unreclaimable.
 *
 * Must be called only after the database write succeeded.
 */
export async function deleteReplacedCmsImage(
  previous: CmsImageOwningRecord,
  next: CmsImageNextState,
): Promise<void> {
  if (!isCmsOwnedImage(previous)) return;
  const previousPathname = previous.blobPathname as string;
  const stillOwnsSameObject =
    next.imageSource === "upload" && next.imageUrl === previous.imageUrl;
  if (stillOwnsSameObject) return;
  await deleteCmsImageIfUnreferenced(previousPathname);
}
