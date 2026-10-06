// Client-safe Social Post API DTO. No MongoDB driver types leak into client bundles.

export type SocialPostApiItem = {
  _id: string;
  platform: "instagram";
  account: string;
  caption: string;
  url: string;
  type: string;
  imageUrl: string;
  imageAlt: string;
  status: "Published" | "Draft" | "Hidden";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
