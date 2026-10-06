import type { ObjectId } from "mongodb";

export type HeroStatus = "active" | "standby";

export type HeroDocument = {
  _id: ObjectId;
  title: string;
  projectName: string;
  location: string;
  imageUrl: string;
  imageAlt: string;
  description: string;
  status: HeroStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type NewHeroDocument = Omit<HeroDocument, "_id">;

// Public landing payload: display fields only, no ids or timestamps.
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
