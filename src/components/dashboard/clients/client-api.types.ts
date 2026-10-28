// Client-safe Client API DTO. No MongoDB driver types leak into client bundles.

export type ClientApiItem = {
  _id: string;
  name: string;
  shortName: string;
  category: string;
  link: string;
  logoUrl: string;
  // Ownership metadata. `logoUrl` is the only render field; these two let the
  // edit page mirror the stored source and are never part of the public feed.
  imageSource?: "upload" | "external";
  blobPathname?: string | null;
  logoAlt: string;
  status: "active" | "hidden";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
