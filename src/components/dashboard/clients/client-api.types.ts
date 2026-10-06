// Client-safe Client API DTO. No MongoDB driver types leak into client bundles.

export type ClientApiItem = {
  _id: string;
  name: string;
  shortName: string;
  category: string;
  link: string;
  logoUrl: string;
  logoAlt: string;
  status: "active" | "hidden";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
