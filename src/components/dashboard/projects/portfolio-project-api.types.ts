// Client-safe Portfolio Project API DTO. No MongoDB driver types leak into client bundles.

export type PortfolioProjectApiItem = {
  _id: string;
  title: string;
  category: string;
  location: string;
  progress: number;
  status: "Active" | "Draft";
  imageUrl: string;
  imageAlt: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
