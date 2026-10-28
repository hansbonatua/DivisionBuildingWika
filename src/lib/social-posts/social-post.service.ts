import { ObjectId } from "mongodb";
import * as socialPostRepository from "@/lib/social-posts/social-post.repository";
import { assertCanManageCms, type CmsActor } from "@/lib/cms/access";
import type { CmsImageSelectionType } from "@/lib/cms/image-source";
import {
  CmsImageValidationError,
  deleteCmsImageIfUnreferenced,
  deleteReplacedCmsImage,
  isCmsOwnedImage,
  resolveCmsImageForWrite,
} from "@/lib/cms/image-storage";
import type {
  CreateSocialPostInput,
  UpdateSocialPostInput,
} from "@/lib/social-posts/social-post.schema";
import type { SocialPostDocument, SocialPostPublic } from "@/lib/social-posts/social-post.types";

// Business rules live here. Route handlers stay thin.
//
// RBAC consolidation Phase 3: every management operation (list/detail/create/
// update/delete) asserts CMS_MANAGE in this domain layer, not only in the route
// handler. `listPublicSocialPosts` is the public landing read and stays open.
//
// Curated Instagram feed (Phase D): the CMS is a MANUAL selection of Instagram
// posts — no Graph API, no OAuth, no feed sync. The editor supplies the original
// post URL (CTA) and, separately, the image WIBEX shows on its own landing,
// which may be a public Blob upload, an external URL, or nothing at all.
//
// Ownership rules are the same as Hero / Portfolio / Green Building / Clients:
// - an uploaded image is re-verified against the PUBLIC CMS store before it is
//   persisted, and its internal pathname is stored alongside it;
// - the previous Blob object is deleted only AFTER a successful database write,
//   and only when this record actually owned it;
// - a text-only edit never touches storage or ownership metadata.
//
// Social Media is the only module where the image is optional, so the "none"
// state is resolved here instead of in the shared helper: it stores no URL and
// no pathname, never a placeholder.

// Text fields shared by create and update; the image is resolved apart because a
// text-only edit must never touch storage.
const TEXT_FIELDS = [
  "platform",
  "account",
  "caption",
  "url",
  "type",
  "imageAlt",
  "status",
  "sortOrder",
] as const satisfies readonly (keyof UpdateSocialPostInput)[];

type SocialImageState = {
  imageUrl: string;
  imageSource: CmsImageSelectionType;
  blobPathname: string | null;
};

/**
 * The effective image state of a stored post.
 *
 * Legacy documents predate `imageSource`: one with an imageUrl is read as
 * external (somebody else's asset, never deleted) and one without is read as
 * none. Used both to decide whether an edit really changed the image and to
 * keep legacy rows from being rewritten by an unrelated save.
 */
function effectiveImageSource(record: {
  imageUrl?: string | null;
  imageSource?: string | null;
}): CmsImageSelectionType {
  if (
    record.imageSource === "upload" ||
    record.imageSource === "external" ||
    record.imageSource === "none"
  ) {
    return record.imageSource;
  }
  return (record.imageUrl ?? "").trim().length > 0 ? "external" : "none";
}

// The shared ownership helpers speak `imageUrl`; Social stores it under the same
// name, so this is only a projection for readability at the call sites.
function imageOwnership(record: {
  imageUrl: string;
  imageSource?: string | null;
  blobPathname?: string | null;
}) {
  return {
    imageUrl: record.imageUrl,
    imageSource: record.imageSource,
    blobPathname: record.blobPathname,
  };
}

/**
 * Resolves the image trio to persist.
 *
 * "none" short-circuits: no URL, no ownership metadata → the landing falls back
 * to its glyph. The two real sources delegate to the shared CMS helper, with an
 * explicit emptiness check first so an empty URL can never be stored as an
 * external image.
 */
async function resolveSocialImageForWrite(input: {
  imageUrl: string;
  imageSource?: CmsImageSelectionType;
  blobPathname?: string | null;
}): Promise<SocialImageState> {
  const source = input.imageSource ?? "external";
  if (source === "none") {
    return { imageUrl: "", imageSource: "none", blobPathname: null };
  }
  const imageUrl = input.imageUrl.trim();
  if (imageUrl.length === 0) {
    throw new CmsImageValidationError("URL gambar wajib diisi.");
  }
  const resolved = await resolveCmsImageForWrite({
    imageUrl,
    imageSource: source,
    blobPathname: input.blobPathname,
  });
  return {
    imageUrl: resolved.imageUrl,
    imageSource: resolved.imageSource,
    blobPathname: resolved.blobPathname,
  };
}

export function isValidSocialPostId(id: string): boolean {
  return ObjectId.isValid(id);
}

export async function listSocialPosts(actor: CmsActor): Promise<SocialPostDocument[]> {
  assertCanManageCms(actor.role);
  return socialPostRepository.findAll();
}

export async function listPublicSocialPosts(): Promise<SocialPostPublic[]> {
  return socialPostRepository.findPublishedPublic();
}

export async function getSocialPostById(
  id: string,
  actor: CmsActor,
): Promise<SocialPostDocument | null> {
  assertCanManageCms(actor.role);
  if (!isValidSocialPostId(id)) {
    return null;
  }
  return socialPostRepository.findById(id);
}

export async function createSocialPost(
  input: CreateSocialPostInput,
  actor: CmsActor,
): Promise<SocialPostDocument> {
  assertCanManageCms(actor.role);
  const image = await resolveSocialImageForWrite({
    imageUrl: input.imageUrl,
    imageSource: input.imageSource,
    blobPathname: input.blobPathname,
  });
  const maxSortOrder = await socialPostRepository.getMaxSortOrder();
  const now = new Date();
  return socialPostRepository.insertOne({
    platform: input.platform,
    account: input.account,
    caption: input.caption,
    url: input.url,
    type: input.type,
    imageUrl: image.imageUrl,
    imageSource: image.imageSource,
    blobPathname: image.blobPathname,
    imageAlt: input.imageAlt === "" ? input.account : input.imageAlt,
    status: input.status,
    sortOrder: input.sortOrder ?? (maxSortOrder === null ? 1 : maxSortOrder + 1),
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateSocialPost(
  id: string,
  input: UpdateSocialPostInput,
  actor: CmsActor,
): Promise<SocialPostDocument | null> {
  assertCanManageCms(actor.role);
  if (!isValidSocialPostId(id)) {
    return null;
  }

  const previous = await socialPostRepository.findById(id);
  if (!previous) {
    return null;
  }

  const patch: Partial<Omit<SocialPostDocument, "_id" | "createdAt">> = {};
  for (const field of TEXT_FIELDS) {
    const value = input[field];
    if (value !== undefined) {
      // Field-by-field assignment keeps the assignment type-safe; a spread of
      // the parsed body would also copy image fields we handle explicitly.
      (patch as Record<string, unknown>)[field] = value;
    }
  }

  // Ownership metadata is only rewritten when the image state actually changes.
  // A text-only edit therefore leaves legacy rows (no imageSource) exactly as
  // they were, and never modifies storage.
  const previousSource = effectiveImageSource(previous);
  const imageChanged =
    (input.imageSource !== undefined && input.imageSource !== previousSource) ||
    (input.imageUrl !== undefined && input.imageUrl !== previous.imageUrl);

  if (imageChanged) {
    const image = await resolveSocialImageForWrite({
      imageUrl:
        input.imageUrl ??
        (previousSource === "none" ? "" : previous.imageUrl),
      imageSource: input.imageSource ?? previousSource,
      blobPathname: input.blobPathname ?? previous.blobPathname ?? null,
    });
    patch.imageUrl = image.imageUrl;
    patch.imageSource = image.imageSource;
    patch.blobPathname = image.blobPathname;
  }

  patch.updatedAt = new Date();
  const updated = await socialPostRepository.updateById(id, patch);
  if (!updated) {
    return null;
  }

  // Storage cleanup runs strictly after the database write succeeded: a failure
  // here only leaves an orphan object, it can never lose the live image.
  if (imageChanged) {
    await deleteReplacedCmsImage(imageOwnership(previous), {
      imageUrl: updated.imageUrl,
      imageSource: updated.imageSource,
    });
  }
  return updated;
}

export async function deleteSocialPost(id: string, actor: CmsActor): Promise<boolean> {
  assertCanManageCms(actor.role);
  if (!isValidSocialPostId(id)) {
    return false;
  }
  const previous = await socialPostRepository.findById(id);
  if (!previous) {
    return false;
  }
  const deleted = await socialPostRepository.deleteById(id);
  if (!deleted) {
    return false;
  }
  // Only a CMS-owned object is reclaimed; an external URL or a legacy row is
  // somebody else's asset and is never deleted.
  if (isCmsOwnedImage(imageOwnership(previous))) {
    await deleteCmsImageIfUnreferenced(previous.blobPathname as string);
  }
  return true;
}
