import { ObjectId } from "mongodb";
import * as greenBuildingRepository from "@/lib/green-buildings/green-building.repository";
import { assertCanManageCms, type CmsActor } from "@/lib/cms/access";
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
    imageUrl: input.imageUrl,
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
  return greenBuildingRepository.updateById(id, { ...input, updatedAt: new Date() });
}

export async function deleteCertificate(id: string, actor: CmsActor): Promise<boolean> {
  assertCanManageCms(actor.role);
  if (!isValidGreenBuildingId(id)) {
    return false;
  }
  return greenBuildingRepository.deleteById(id);
}
