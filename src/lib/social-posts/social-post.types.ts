import type { ObjectId } from "mongodb";

export type SocialPlatform = "instagram";
export type SocialPostStatus = "Published" | "Draft" | "Hidden";

export type SocialPostDocument = {
  _id: ObjectId;
  platform: SocialPlatform;
  account: string;
  caption: string;
  url: string;
  type: string;
  imageUrl: string;
  imageAlt: string;
  status: SocialPostStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type NewSocialPostDocument = Omit<SocialPostDocument, "_id">;

// Public landing payload: display fields only, no ids or timestamps.
export type SocialPostPublic = {
  platform: SocialPlatform;
  account: string;
  caption: string;
  url: string;
  type: string;
  imageUrl: string;
};

// JSON-safe serialization (ObjectId/Date are not plain JSON).
export function serializeSocialPostDocument(doc: SocialPostDocument): Record<string, unknown> {
  return {
    ...doc,
    _id: doc._id.toHexString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
