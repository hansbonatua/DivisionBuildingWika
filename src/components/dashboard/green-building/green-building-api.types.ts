// Client-safe Green Building API DTO. No MongoDB driver types leak into client bundles.

import type { CmsImageSourceType } from "@/lib/cms/image-source";

export type GreenBuildingApiItem = {
  _id: string;
  projectName: string;
  certificationBody: string;
  certificationType: string;
  level: string;
  year: number;
  certificateNumber: string;
  score: number;
  description: string;
  imageUrl: string;
  // Admin-only management metadata: which source the image came from and, for
  // uploads, the internal CMS storage path. Never part of the public endpoint.
  imageSource?: CmsImageSourceType;
  blobPathname?: string | null;
  imageAlt: string;
  status: "Verified" | "Pending" | "Expired";
  publishStatus: "Draft" | "Published" | "Archived";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
