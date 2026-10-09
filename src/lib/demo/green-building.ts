export type CertificateItem = {
  id: number;
  image: string;
  projectName: string;
  certificationBody: string;
  certificationType: string;
  level: string;
  year: number;
  certificateNumber: string;
  score: number;
  description: string;
  status: "Verified" | "Pending" | "Expired";
  expiryDate: string;
  displayOrder: number;
  publishStatus: string;
};

export const TYPE_OPTIONS = ["Greenship", "LEED", "EDGE", "Other"];
export const LEVEL_OPTIONS = ["Platinum", "Gold", "Silver", "Certified"];
export const STATUS_OPTIONS: CertificateItem["status"][] = ["Verified", "Pending", "Expired"];
export const PUBLISH_OPTIONS = ["Draft", "Published", "Archived"];
