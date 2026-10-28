import { ObjectId } from "mongodb";
import * as portfolioProjectRepository from "@/lib/portfolio-projects/portfolio-project.repository";
import { assertCanManageCms, type CmsActor } from "@/lib/cms/access";
import {
  deleteCmsImageIfUnreferenced,
  deleteReplacedCmsImage,
  isCmsOwnedImage,
  resolveCmsImageForWrite,
} from "@/lib/cms/image-storage";
import type {
  CreatePortfolioProjectInput,
  UpdatePortfolioProjectInput,
} from "@/lib/portfolio-projects/portfolio-project.schema";
import type {
  PortfolioProjectDocument,
  PortfolioProjectPublic,
} from "@/lib/portfolio-projects/portfolio-project.types";

// Business rules live here. Route handlers stay thin.
//
// RBAC consolidation Phase 3: every management operation (list/detail/create/
// update/delete) asserts CMS_MANAGE in this domain layer, not only in the route
// handler. `listPublicPortfolioProjects` is the public landing read and stays open.
//
// CMS public-image revision (Phase B): same ownership rules as Hero.
// - a record has exactly ONE image source, upload or external;
// - `imageUrl` remains the only field the landing cards read;
// - an uploaded image is re-verified against the PUBLIC CMS store before it is
//   persisted, and its internal pathname is stored alongside it;
// - the previous Blob object is deleted only AFTER a successful database write,
//   and only when this record actually owned it.

// Text fields are shared by create and update; image fields are resolved apart
// because a text-only edit must never touch storage.
const TEXT_FIELDS = [
  "title",
  "category",
  "location",
  "progress",
  "status",
  "imageAlt",
  "description",
  "sortOrder",
] as const satisfies readonly (keyof UpdatePortfolioProjectInput)[];

export function isValidPortfolioProjectId(id: string): boolean {
  return ObjectId.isValid(id);
}

export async function listPortfolioProjects(
  actor: CmsActor,
): Promise<PortfolioProjectDocument[]> {
  assertCanManageCms(actor.role);
  return portfolioProjectRepository.findAll();
}

export async function listPublicPortfolioProjects(): Promise<PortfolioProjectPublic[]> {
  return portfolioProjectRepository.findActivePublic();
}

export async function getPortfolioProjectById(
  id: string,
  actor: CmsActor,
): Promise<PortfolioProjectDocument | null> {
  assertCanManageCms(actor.role);
  if (!isValidPortfolioProjectId(id)) {
    return null;
  }
  return portfolioProjectRepository.findById(id);
}

export async function createPortfolioProject(
  input: CreatePortfolioProjectInput,
  actor: CmsActor,
): Promise<PortfolioProjectDocument> {
  assertCanManageCms(actor.role);
  const image = await resolveCmsImageForWrite({
    imageUrl: input.imageUrl,
    imageSource: input.imageSource,
    blobPathname: input.blobPathname,
  });
  const maxSortOrder = await portfolioProjectRepository.getMaxSortOrder();
  const now = new Date();
  return portfolioProjectRepository.insertOne({
    title: input.title,
    category: input.category,
    location: input.location,
    progress: input.progress,
    status: input.status,
    imageUrl: image.imageUrl,
    imageSource: image.imageSource,
    blobPathname: image.blobPathname,
    imageAlt: input.imageAlt === "" ? input.title : input.imageAlt,
    description: input.description,
    sortOrder: input.sortOrder ?? (maxSortOrder === null ? 1 : maxSortOrder + 1),
    createdAt: now,
    updatedAt: now,
  });
}

export async function updatePortfolioProject(
  id: string,
  input: UpdatePortfolioProjectInput,
  actor: CmsActor,
): Promise<PortfolioProjectDocument | null> {
  assertCanManageCms(actor.role);
  if (!isValidPortfolioProjectId(id)) {
    return null;
  }

  const previous = await portfolioProjectRepository.findById(id);
  if (!previous) {
    return null;
  }

  const patch: Partial<Omit<PortfolioProjectDocument, "_id" | "createdAt">> = {};
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
  const updated = await portfolioProjectRepository.updateById(id, patch);
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

export async function deletePortfolioProject(id: string, actor: CmsActor): Promise<boolean> {
  assertCanManageCms(actor.role);
  if (!isValidPortfolioProjectId(id)) {
    return false;
  }
  const previous = await portfolioProjectRepository.findById(id);
  if (!previous) {
    return false;
  }
  const deleted = await portfolioProjectRepository.deleteById(id);
  if (!deleted) {
    return false;
  }
  if (isCmsOwnedImage(previous)) {
    await deleteCmsImageIfUnreferenced(previous.blobPathname as string);
  }
  return true;
}
