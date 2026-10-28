import { ObjectId } from "mongodb";
import * as greenBuildingRepository from "@/lib/green-buildings/green-building.repository";
import { assertCanManageCms, type CmsActor } from "@/lib/cms/access";
import {
  deleteCmsImageIfUnreferenced,
  deleteReplacedCmsImage,
  isCmsOwnedImage,
  resolveCmsImageForWrite,
} from "@/lib/cms/image-storage";
import type {
  CreateGreenBuildingInput,
  UpdateGreenBuildingInput,
} from "@/lib/green-buildings/green-building.schema";
import type {
  GreenBuildingCertificateDocument,
  GreenBuildingCertificatePublic,
} from "@/lib/green-buildings/green-building.types";

// Business rules live here. Route handlers stay thin.
//
// RBAC consolidation Phase 3: every management operation (list/detail/create/
// update/delete) asserts CMS_MANAGE in this domain layer, not only in the route
// handler. `listPublicCertificates` is the public landing read and stays open.
//
// CMS public-image revision (Phase B): same ownership rules as Hero and
// Portfolio. Publication is still decided solely by `publishStatus`, never by
// the image source.

// Text fields are shared by create and update; image fields are resolved apart
// because a text-only edit must never touch storage.
const TEXT_FIELDS = [
  "projectName",
  "certificationBody",
  "certificationType",
  "level",
  "year",
  "certificateNumber",
  "score",
  "description",
  "status",
  "publishStatus",
  "imageAlt",
  "sortOrder",
] as const satisfies readonly (keyof UpdateGreenBuildingInput)[];

export function isValidGreenBuildingId(id: string): boolean {
  return ObjectId.isValid(id);
}

export async function listCertificates(
  actor: CmsActor,
): Promise<GreenBuildingCertificateDocument[]> {
  assertCanManageCms(actor.role);
  return greenBuildingRepository.findAll();
}

export async function listPublicCertificates(): Promise<GreenBuildingCertificatePublic[]> {
  return greenBuildingRepository.findPublishedPublic();
}

export async function getCertificate(
  id: string,
  actor: CmsActor,
): Promise<GreenBuildingCertificateDocument | null> {
  assertCanManageCms(actor.role);
  if (!isValidGreenBuildingId(id)) {
    return null;
  }
  return greenBuildingRepository.findById(id);
}

export async function createCertificate(
  input: CreateGreenBuildingInput,
  actor: CmsActor,
): Promise<GreenBuildingCertificateDocument> {
  assertCanManageCms(actor.role);
  const image = await resolveCmsImageForWrite({
    imageUrl: input.imageUrl,
    imageSource: input.imageSource,
    blobPathname: input.blobPathname,
  });
  const maxSortOrder = await greenBuildingRepository.getMaxSortOrder();
  const now = new Date();
  return greenBuildingRepository.insertOne({
    projectName: input.projectName,
    certificationBody: input.certificationBody,
    certificationType: input.certificationType,
    level: input.level,
    year: input.year,
    certificateNumber: input.certificateNumber,
    score: input.score,
    description: input.description,
    imageUrl: image.imageUrl,
    imageSource: image.imageSource,
    blobPathname: image.blobPathname,
    imageAlt: input.imageAlt === "" ? input.projectName : input.imageAlt,
    status: input.status,
    publishStatus: input.publishStatus,
    sortOrder: input.sortOrder ?? (maxSortOrder === null ? 1 : maxSortOrder + 1),
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateCertificate(
  id: string,
  input: UpdateGreenBuildingInput,
  actor: CmsActor,
): Promise<GreenBuildingCertificateDocument | null> {
  assertCanManageCms(actor.role);
  if (!isValidGreenBuildingId(id)) {
    return null;
  }

  const previous = await greenBuildingRepository.findById(id);
  if (!previous) {
    return null;
  }

  const patch: Partial<Omit<GreenBuildingCertificateDocument, "_id" | "createdAt">> = {};
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
  const updated = await greenBuildingRepository.updateById(id, patch);
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

export async function deleteCertificate(id: string, actor: CmsActor): Promise<boolean> {
  assertCanManageCms(actor.role);
  if (!isValidGreenBuildingId(id)) {
    return false;
  }
  const previous = await greenBuildingRepository.findById(id);
  if (!previous) {
    return false;
  }
  const deleted = await greenBuildingRepository.deleteById(id);
  if (!deleted) {
    return false;
  }
  if (isCmsOwnedImage(previous)) {
    await deleteCmsImageIfUnreferenced(previous.blobPathname as string);
  }
  return true;
}
