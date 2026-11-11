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
  knowledge: {
    total: number;
    lessonLearn: number;
    bestPractice: number;
    vaVe: number;
  };
};

export type SasaaData = {
  project: SasaaProjectOption;
  photos: SasaaPhoto[];
  photosComplete: boolean;
  metrics: SasaaMetrics;
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
