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

export const initialCertificates: CertificateItem[] = [
  {
    id: 1,
    image: "/asset/hero/7.jpg",
    projectName: "Green Terminal Expansion",
    certificationBody: "Green Building Council Indonesia",
    certificationType: "Greenship",
    level: "Platinum",
    year: 2026,
    certificateNumber: "GBC-2026-001",
    score: 93,
    description: "Sustainable building certification",
    status: "Verified",
    expiryDate: "2030-12-31",
    displayOrder: 1,
    publishStatus: "Published",
  },
  {
    id: 2,
    image: "/asset/hero/10.jpg",
    projectName: "Dolor Sit Amet Tower",
    certificationBody: "Green Building Council Indonesia",
    certificationType: "LEED",
    level: "Gold",
    year: 2025,
    certificateNumber: "GBC-2025-014",
    score: 88,
    description: "Lorem ipsum dolor sit amet consectetur adipiscing elit",
    status: "Verified",
    expiryDate: "2029-06-30",
    displayOrder: 2,
    publishStatus: "Published",
  },
  {
    id: 3,
    image: "/asset/hero/14.jpg",
    projectName: "Consectetur Green Complex",
    certificationBody: "Green Building Council Indonesia",
    certificationType: "EDGE",
    level: "Silver",
    year: 2024,
    certificateNumber: "GBC-2024-007",
    score: 76,
    description: "Sed do eiusmod tempor incididunt ut labore",
    status: "Pending",
    expiryDate: "2028-12-31",
    displayOrder: 3,
    publishStatus: "Draft",
  },
];

export function getCertificateById(id: number): CertificateItem | undefined {
  return initialCertificates.find((certificate) => certificate.id === id);
}
