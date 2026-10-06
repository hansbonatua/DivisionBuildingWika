// Client-safe Hero API DTO. No MongoDB driver types leak into client bundles.

export type HeroApiItem = {
  _id: string;
  title: string;
  projectName: string;
  location: string;
  imageUrl: string;
  imageAlt: string;
  description: string;
  status: "active" | "standby";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type HeroListResponse = {
  data: HeroApiItem[];
};

export type HeroApiError = {
  error: {
    message: string;
    details?: unknown;
  };
};
