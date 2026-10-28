// Client-safe Portfolio Project API DTO. No MongoDB driver types leak into client bundles.

import type { CmsImageSourceType } from "@/lib/cms/image-source";

export type PortfolioProjectApiItem = {
  _id: string;
  title: string;
  category: string;
  location: string;
  progress: number;
  status: "Active" | "Draft";
  imageUrl: string;
  // Admin-only management metadata: which source the image came from and, for
  // uploads, the internal CMS storage path. Never part of the public endpoint.
  imageSource?: CmsImageSourceType;
  blobPathname?: string | null;
  imageAlt: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
