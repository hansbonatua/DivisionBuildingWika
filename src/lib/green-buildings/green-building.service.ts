import { ObjectId } from "mongodb";
import * as greenBuildingRepository from "@/lib/green-buildings/green-building.repository";
import type {
  CreateGreenBuildingInput,
  UpdateGreenBuildingInput,
} from "@/lib/green-buildings/green-building.schema";
import type {
  GreenBuildingCertificateDocument,
  GreenBuildingCertificatePublic,
} from "@/lib/green-buildings/green-building.types";

// Business rules live here. Route handlers stay thin.
// NOTE: endpoints are temporarily unauthenticated (dev stage);
// add auth checks at the route/middleware layer later without touching this file.

export function isValidGreenBuildingId(id: string): boolean {
  return ObjectId.isValid(id);
}

export async function listCertificates(): Promise<GreenBuildingCertificateDocument[]> {
  return greenBuildingRepository.findAll();
}

export async function listPublicCertificates(): Promise<GreenBuildingCertificatePublic[]> {
  return greenBuildingRepository.findPublishedPublic();
}

export async function getCertificate(id: string): Promise<GreenBuildingCertificateDocument | null> {
  if (!isValidGreenBuildingId(id)) {
    return null;
  }
  return greenBuildingRepository.findById(id);
}

export async function createCertificate(
  input: CreateGreenBuildingInput,
): Promise<GreenBuildingCertificateDocument> {
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
): Promise<GreenBuildingCertificateDocument | null> {
  if (!isValidGreenBuildingId(id)) {
    return null;
  }
  return greenBuildingRepository.updateById(id, { ...input, updatedAt: new Date() });
}

export async function deleteCertificate(id: string): Promise<boolean> {
  if (!isValidGreenBuildingId(id)) {
    return false;
  }
  return greenBuildingRepository.deleteById(id);
}
