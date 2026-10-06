import type { ObjectId } from "mongodb";

export type ClientStatus = "active" | "hidden";

export type ClientDocument = {
  _id: ObjectId;
  name: string;
  shortName: string;
  category: string;
  link: string;
  logoUrl: string;
  logoAlt: string;
  status: ClientStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type NewClientDocument = Omit<ClientDocument, "_id">;

// Public landing payload: display fields only, no ids or timestamps.
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
