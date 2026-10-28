// Client-safe Social Post API DTO. No MongoDB driver types leak into client bundles.

export type SocialPostApiItem = {
  _id: string;
  platform: "instagram";
  account: string;
  caption: string;
  url: string;
  type: string;
  // Landing image. Empty string when the post is curated without one.
  imageUrl: string;
  // Ownership metadata: lets the edit page mirror the stored source and keeps
  // legacy rows (absent) from being rewritten. Never part of the public feed.
  imageSource?: "upload" | "external" | "none";
  blobPathname?: string | null;
  imageAlt: string;
  status: "Published" | "Draft" | "Hidden";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
