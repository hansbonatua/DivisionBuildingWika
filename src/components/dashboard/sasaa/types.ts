// Client-side mirror of the SASAA payload (src/lib/sasaa/types.ts).
//
// Deliberately duplicated instead of imported: the server module pulls Drizzle
// and pg schema types, and a Client Component must never drag server code into
// the browser bundle. Keep the field names identical to the server DTO.
//
// The one shared import is @/lib/msl/score, which is dependency-free on purpose
// and already used by Client Components for category labels.

import type { MslCategory } from "@/lib/msl/score";
export type SasaaProjectOption = {
  id: string;
  name: string;
  location: string;
  year: number;
  pic: { id: string; name: string };
};

export type SasaaPhoto = {
  slot: number;
  url: string;
  alt: string;
};

export type SasaaMetrics = {
  msl: {
    averageScore: number | null;
    category: MslCategory | null;
    assessedMonths: number;
    latestMonth: number | null;
  };
  engineeringDatabase: {
    totalEntries: number;
    categoriesCovered: number;
    totalCategories: number;
  };
  pdoc: {
    year: number | null;
    completedWeeks: number;
    totalWeeks: number;
    documentedMonths: number;
  };
  knowledge: SasaaKnowledgeCounts;
};

/** One plotted month (index = month - 1). */
export type SasaaChartPoint = {
  month: number;
  value: number;
};

/** One MSL month: three stored components plus their canonical score. */
export type SasaaMslMonths = {
  total: number;
  engineeringValue: number;
  metodeKerja: number;
  engineeringExecution: number;
};

export type SasaaKnowledgeItem = {
  id: string;
  content: string;
};

export type SasaaKnowledgeCounts = {
  total: number;
  lessonLearn: number;
  bestPractice: number;
  vaVe: number;
};

export type SasaaKnowledgeCategoryKey = "lesson_learn" | "best_practice" | "va_ve";

export type SasaaKnowledgePage = {
  counts: SasaaKnowledgeCounts;
  byCategory: Record<SasaaKnowledgeCategoryKey, SasaaKnowledgeItem[]>;
  page: number;
  perCategory: number;
  hasMore: boolean;
};

export type SasaaGreenBuilding = {
  lembaga: string;
  level: string;
  status: string;
  certificateYear: number;
  documentationUrl: string | null;
};

export type SasaaEngDbCategoryStatus = {
  category: string;
  covered: boolean;
};

export type SasaaEngDbStatus = {
  covered: number;
  total: number;
  categories: SasaaEngDbCategoryStatus[];
};

export type SasaaEsgStatus = "Complete" | "Half";

export type SasaaCharts = {
  pdoc: SasaaChartPoint[];
  msl: SasaaMslMonths[];
  esg: Array<SasaaEsgStatus | null>;
  engDb: SasaaEngDbStatus;
};

export type SasaaData = {
  project: SasaaProjectOption;
  photos: SasaaPhoto[];
  photosComplete: boolean;
  metrics: SasaaMetrics;
  greenBuilding: SasaaGreenBuilding | null;
  knowledge: SasaaKnowledgePage;
  charts: SasaaCharts;
};

export async function readApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: { message?: string };
    };
    if (
      typeof body.error?.message === "string" &&
      body.error.message.trim() !== ""
    ) {
      return body.error.message;
    }
  } catch {
    /* non-JSON error body */
  }
  if (response.status === 401) {
    return "Sesi Anda berakhir. Silakan masuk kembali.";
  }
  if (response.status === 403) {
    return "Anda tidak memiliki akses ke data ini.";
  }
  if (response.status === 404) {
    return "Master Project tidak ditemukan.";
  }
  return fallback;
}
