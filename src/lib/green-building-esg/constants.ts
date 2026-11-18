// Domain constants for Sertifikasi Green Building.
//
// The level list is intentionally tied to lembaga. BGH and Greenship use
// different level vocabularies; the same arrays feed Zod and the database CHECK
// constraint must stay in sync with them.

export const GREEN_BUILDING_LEMBAGA = ["BGH", "Greenship"] as const;
export type GreenBuildingLembaga = (typeof GREEN_BUILDING_LEMBAGA)[number];

export const GREEN_BUILDING_LEVELS = [
  "Utama",
  "Madya",
  "Pratama",
  "Certified/Bronze",
  "Silver",
  "Gold",
  "Platinum",
] as const;
export type GreenBuildingLevel = (typeof GREEN_BUILDING_LEVELS)[number];

export const GREEN_BUILDING_LEVELS_BY_LEMBAGA = {
  BGH: ["Utama", "Madya", "Pratama"],
  Greenship: ["Certified/Bronze", "Silver", "Gold", "Platinum"],
} as const satisfies Record<GreenBuildingLembaga, readonly GreenBuildingLevel[]>;

export const GREEN_BUILDING_STATUSES = [
  "Certified",
  "Non-Certified",
  "Under Construction",
] as const;
export type GreenBuildingStatus = (typeof GREEN_BUILDING_STATUSES)[number];

export const GREEN_BUILDING_DOCUMENTATION_MAX_LENGTH = 2048;
export const GREEN_BUILDING_PROJECT_OPTION_LIMIT = 50;
