import type { ObjectId } from "mongodb";
import type { CmsImageSourceType } from "@/lib/cms/image-source";

export type HeroStatus = "active" | "standby";

export type HeroDocument = {
  _id: ObjectId;
  title: string;
  projectName: string;
  location: string;
  imageUrl: string;
  // Image ownership metadata (optional, additive — Mongo needs no migration).
  // Absent/undefined on every legacy document, which is read as "external" and
  // therefore never auto-deleted.
  imageSource?: CmsImageSourceType;
  blobPathname?: string | null;
  imageAlt: string;
  description: string;
  status: HeroStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type NewHeroDocument = Omit<HeroDocument, "_id">;

// Public landing payload: display fields only, no ids, timestamps or storage
// metadata. `blobPathname` and `imageSource` must never reach this projection.
export type HeroPublic = {
  imageUrl: string;
  imageAlt: string;
  projectName: string;
  location: string;
  title: string;
};

// JSON-safe serialization (ObjectId/Date are not plain JSON).
export function serializeHeroDocument(doc: HeroDocument): Record<string, unknown> {
  return {
    ...doc,
    _id: doc._id.toHexString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
