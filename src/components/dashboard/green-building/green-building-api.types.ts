// Client-safe Green Building API DTO. No MongoDB driver types leak into client bundles.

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
  imageAlt: string;
  status: "Verified" | "Pending" | "Expired";
  publishStatus: "Draft" | "Published" | "Archived";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
