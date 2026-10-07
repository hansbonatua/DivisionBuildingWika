import type { ObjectId } from "mongodb";

export type PortfolioProjectStatus = "Active" | "Draft";

export type PortfolioProjectDocument = {
  _id: ObjectId;
  title: string;
  category: string;
  location: string;
  progress: number;
  status: PortfolioProjectStatus;
  imageUrl: string;
  imageAlt: string;
  description: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type NewPortfolioProjectDocument = Omit<PortfolioProjectDocument, "_id">;

// Public landing payload: display fields only, no ids or timestamps.
export type PortfolioProjectPublic = {
  title: string;
  category: string;
  location: string;
  imageUrl: string;
  imageAlt: string;
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
