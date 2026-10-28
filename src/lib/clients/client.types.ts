import type { ObjectId } from "mongodb";
import type { CmsImageSourceType } from "@/lib/cms/image-source";

export type ClientStatus = "active" | "hidden";

export type ClientDocument = {
  _id: ObjectId;
  name: string;
  shortName: string;
  category: string;
  link: string;
  logoUrl: string;
  // Image ownership metadata (optional, additive — Mongo needs no migration).
  // Absent on every legacy document, which is read as "external" and is
  // therefore never auto-deleted. Shared CMS field names, not logo*-prefixed
  // ones, so the reference registry and cleanup stay uniform across modules.
  imageSource?: CmsImageSourceType;
  blobPathname?: string | null;
  logoAlt: string;
  status: ClientStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type NewClientDocument = Omit<ClientDocument, "_id">;

// Public landing payload: display fields only, no ids, timestamps or storage
// metadata. `blobPathname` and `imageSource` must never reach this projection.
export type ClientPublic = {
  name: string;
  shortName: string;
  logoUrl: string;
  logoAlt: string;
  link: string;
};

// JSON-safe serialization (ObjectId/Date are not plain JSON).
export function serializeClientDocument(doc: ClientDocument): Record<string, unknown> {
  return {
    ...doc,
    _id: doc._id.toHexString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
