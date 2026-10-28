import { ObjectId } from "mongodb";
import * as heroRepository from "@/lib/heroes/hero.repository";
import { assertCanManageCms, type CmsActor } from "@/lib/cms/access";
import {
  deleteCmsImageIfUnreferenced,
  deleteReplacedCmsImage,
  isCmsOwnedImage,
  resolveCmsImageForWrite,
} from "@/lib/cms/image-storage";
import type { CreateHeroInput, UpdateHeroInput } from "@/lib/heroes/hero.schema";
import type { HeroDocument, HeroPublic } from "@/lib/heroes/hero.types";

// Business rules live here. Route handlers stay thin.
//
// RBAC consolidation Phase 3: every management operation (list/detail/create/
// update/delete) asserts CMS_MANAGE in this domain layer, not only in the route
// handler. `listPublicHeroes` is the public landing read and stays open.
//
// CMS public-image revision (Phase A, Hero pilot):
// - a record has exactly ONE image source, upload or external;
// - `imageUrl` remains the only field the landing page reads;
// - an uploaded image is re-verified against the PUBLIC CMS store before it is
//   persisted, and its internal pathname is stored alongside it;
// - the previous Blob object is deleted only AFTER a successful database write,
//   and only when this record actually owned it.

// Text fields are shared by create and update; image fields are resolved apart
// because a text-only edit must never touch storage.
const TEXT_FIELDS = [
  "title",
  "projectName",
  "location",
  "imageAlt",
  "description",
  "status",
  "sortOrder",
] as const satisfies readonly (keyof UpdateHeroInput)[];

export function isValidHeroId(id: string): boolean {
  return ObjectId.isValid(id);
}

export async function listHeroes(actor: CmsActor): Promise<HeroDocument[]> {
  assertCanManageCms(actor.role);
  return heroRepository.findAll();
}

export async function listPublicHeroes(): Promise<HeroPublic[]> {
  return heroRepository.findActivePublic();
}

export async function getHero(id: string, actor: CmsActor): Promise<HeroDocument | null> {
  assertCanManageCms(actor.role);
  if (!isValidHeroId(id)) {
    return null;
  }
  return heroRepository.findById(id);
}

export async function createHero(
  input: CreateHeroInput,
  actor: CmsActor,
): Promise<HeroDocument> {
  assertCanManageCms(actor.role);
  const image = await resolveCmsImageForWrite({
    imageUrl: input.imageUrl,
    imageSource: input.imageSource,
    blobPathname: input.blobPathname,
  });
  const maxSortOrder = await heroRepository.getMaxSortOrder();
  const now = new Date();
  return heroRepository.insertOne({
    title: input.title,
    projectName: input.projectName,
    location: input.location,
    imageUrl: image.imageUrl,
    imageSource: image.imageSource,
    blobPathname: image.blobPathname,
    imageAlt: input.imageAlt,
    description: input.description,
    status: input.status,
    sortOrder: input.sortOrder ?? (maxSortOrder === null ? 1 : maxSortOrder + 1),
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateHero(
  id: string,
  input: UpdateHeroInput,
  actor: CmsActor,
): Promise<HeroDocument | null> {
  assertCanManageCms(actor.role);
  if (!isValidHeroId(id)) {
    return null;
  }

  const previous = await heroRepository.findById(id);
  if (!previous) {
    return null;
  }

  const patch: Partial<Omit<HeroDocument, "_id" | "createdAt">> = {};
  for (const field of TEXT_FIELDS) {
    const value = input[field];
    if (value !== undefined) {
      // Field-by-field assignment keeps the assignment type-safe; a spread of
      // the parsed body would also copy image fields we handle explicitly.
      (patch as Record<string, unknown>)[field] = value;
    }
  }

  // Ownership metadata is rewritten when the image itself changes OR when the
  // record stops being an upload. A text-only edit therefore leaves legacy rows
  // (no imageSource) exactly as they were, and never modifies storage.
  //
  // The source transition matters even when the URL string is identical
  // ("upload -> external" with the seeded Blob URL left in the field): the
  // record must clear blobPathname and release the object it no longer owns.
  const sourceChanged =
    input.imageSource !== undefined &&
    input.imageSource !== (previous.imageSource ?? "external");
  const imageChanged =
    (typeof input.imageUrl === "string" && input.imageUrl !== previous.imageUrl) ||
    sourceChanged;

  if (imageChanged) {
    const image = await resolveCmsImageForWrite({
      imageUrl: (input.imageUrl as string | undefined) ?? previous.imageUrl,
      imageSource: input.imageSource,
      blobPathname: input.blobPathname,
    });
    patch.imageUrl = image.imageUrl;
    patch.imageSource = image.imageSource;
    patch.blobPathname = image.blobPathname;
  }

  patch.updatedAt = new Date();
  const updated = await heroRepository.updateById(id, patch);
  if (!updated) {
    return null;
  }

  // Storage cleanup runs strictly after the database write succeeded: a failure
  // here only leaves an orphan object, it can never lose the live image.
  if (imageChanged) {
    await deleteReplacedCmsImage(previous, {
      imageUrl: updated.imageUrl,
      imageSource: updated.imageSource,
    });
  }
  return updated;
}

export async function deleteHero(id: string, actor: CmsActor): Promise<boolean> {
  assertCanManageCms(actor.role);
  if (!isValidHeroId(id)) {
    return false;
  }
  const previous = await heroRepository.findById(id);
  if (!previous) {
    return false;
  }
  const deleted = await heroRepository.deleteById(id);
  if (!deleted) {
    return false;
  }
  if (isCmsOwnedImage(previous)) {
    await deleteCmsImageIfUnreferenced(previous.blobPathname as string);
  }
  return true;
}
