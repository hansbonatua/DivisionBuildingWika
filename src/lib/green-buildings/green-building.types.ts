import type { ObjectId } from "mongodb";

export type GbcVerification = "Verified" | "Pending" | "Expired";
export type GbcPublish = "Draft" | "Published" | "Archived";

export type GreenBuildingCertificateDocument = {
  _id: ObjectId;
  projectName: string;
  certificationBody: string;
  certificationType: string;
  level: string;
  year: number;
  certificateNumber: string;
  score: number;
  description: string;
  imageUrl: string;
  imageAlt: string;
  status: GbcVerification;
  publishStatus: GbcPublish;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type NewGreenBuildingCertificateDocument = Omit<GreenBuildingCertificateDocument, "_id">;

// Public landing payload: display fields only, no ids or timestamps.
export type GreenBuildingCertificatePublic = {
  projectName: string;
  certificationBody: string;
  imageUrl: string;
  imageAlt: string;
  level: string;
  year: number;
  score: number;
  description: string;
};

// JSON-safe serialization (ObjectId/Date are not plain JSON).
export function serializeGreenBuildingCertificateDocument(
  doc: GreenBuildingCertificateDocument,
): Record<string, unknown> {
  return {
    ...doc,
    _id: doc._id.toHexString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
