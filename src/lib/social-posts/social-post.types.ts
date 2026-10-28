import type { ObjectId } from "mongodb";
import type { CmsImageSelectionType } from "@/lib/cms/image-source";

export type SocialPlatform = "instagram";
export type SocialPostStatus = "Published" | "Draft" | "Hidden";

export type SocialPostDocument = {
  _id: ObjectId;
  platform: SocialPlatform;
  account: string;
  caption: string;
  url: string;
  type: string;
  // Landing image. Empty string when the post is curated WITHOUT an image
  // (`imageSource: "none"`); the landing then renders its Instagram glyph.
  // Same empty-string convention as `caption` / `imageAlt` — no null churn.
  imageUrl: string;
  // Image ownership metadata (optional, additive — Mongo needs no migration).
  // Absent on every legacy document, which is read as "external" when an
  // imageUrl exists and "none" when it does not, and is therefore never
  // auto-deleted. Shared CMS field names, like every other module.
  imageSource?: CmsImageSelectionType;
  blobPathname?: string | null;
  imageAlt: string;
  status: SocialPostStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type NewSocialPostDocument = Omit<SocialPostDocument, "_id">;

// Public landing payload: display fields only, no ids or timestamps.
// `imageSource` and `blobPathname` must never reach this projection: the
// landing infers its glyph fallback from a missing `imageUrl`, so it has no
// need for storage internals. `url` is the original Instagram post URL.
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
