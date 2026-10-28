import type { ObjectId } from "mongodb";
import type { CmsImageSourceType } from "@/lib/cms/image-source";

export type PortfolioProjectStatus = "Active" | "Draft";

export type PortfolioProjectDocument = {
  _id: ObjectId;
  title: string;
  category: string;
  location: string;
  progress: number;
  status: PortfolioProjectStatus;
  imageUrl: string;
  // Image ownership metadata (optional, additive — Mongo needs no migration).
  // Absent on every legacy document, which is read as "external" and is
  // therefore never auto-deleted.
  imageSource?: CmsImageSourceType;
  blobPathname?: string | null;
  imageAlt: string;
  description: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type NewPortfolioProjectDocument = Omit<PortfolioProjectDocument, "_id">;

// Public landing payload: display fields only, no ids, timestamps or storage
// metadata. `blobPathname` and `imageSource` must never reach this projection.
export type PortfolioProjectPublic = {
  title: string;
  category: string;
  location: string;
  imageUrl: string;
  imageAlt: string;
  description: string;
};

// JSON-safe serialization (ObjectId/Date are not plain JSON).
export function serializePortfolioProjectDocument(
  doc: PortfolioProjectDocument,
): Record<string, unknown> {
  return {
    ...doc,
    _id: doc._id.toHexString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
