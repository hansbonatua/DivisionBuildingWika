import type { EngineeringDatabaseCategory } from "@/lib/engineering-database/access";
import type { EsgMonthStatus } from "@/lib/esg-assessment/constants";
import type { KnowledgeType } from "@/lib/knowledge-management/schema";
import type { MslCategory } from "@/lib/msl/score";
import type { ProjectPhotoSlot } from "@/lib/dashboard/project-photo-storage";

// SASAA dashboard DTOs (backend Step 1).
//
// These types are the single server-side shape for the SASAA payload: the
// aggregator, the repository and the route handlers all speak them. Client
// Components keep their own local copy (src/components/dashboard/sasaa/types.ts)
// and are deliberately NOT imported here, so this module never pulls a
// Client Component into a server graph (and vice versa).
//
// Every chart series is fixed-length (12 months, January first) so a consumer
// can index it by `month - 1` without re-deriving the period.

export type SasaaActor = {
  id: string;
  role: string;
  status: string;
};

export type SasaaProjectRef = {
  id: string;
  name: string;
  location: string;
  year: number;
  pic: { id: string; name: string };
};

export type SasaaPhoto = {
  slot: ProjectPhotoSlot;
  url: string;
  alt: string;
};

export type ProjectPhotosData = {
  project: { id: string; name: string };
  photos: SasaaPhoto[];
  photosComplete: boolean;
};

/** One plotted month. `value` is always inside the 0..5 assessment scale. */
export type SasaaChartPoint = {
  month: number;
  value: number;
};

/**
 * One MSL month. `total` is the canonical score of the three stored components
 * (equally weighted average, two decimals — see @/lib/msl/score). A month
 * without an assessment is all zeros; the array index is `month - 1`.
 */
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

/**
 * One page of Knowledge Management records. `counts` covers the whole project
 * (not just this page), so a pager can be rendered without another request;
 * `byCategory` holds at most `perCategory` items per submenu.
 */
export type SasaaKnowledgePage = {
  counts: SasaaKnowledgeCounts;
  byCategory: Record<KnowledgeType, SasaaKnowledgeItem[]>;
  page: number;
  perCategory: number;
  hasMore: boolean;
};

/** Latest certificate of the project (highest certificate_year). */
export type SasaaGreenBuilding = {
  lembaga: string;
  level: string;
  status: string;
  certificateYear: number;
  documentationUrl: string | null;
};

export type SasaaEngDbCategoryStatus = {
  category: EngineeringDatabaseCategory;
  covered: boolean;
};

/**
 * Engineering Database coverage. `total` is the canonical category count from
 * @/lib/engineering-database/access — never a list duplicated here.
 */
export type SasaaEngDbStatus = {
  covered: number;
  total: number;
  categories: SasaaEngDbCategoryStatus[];
};

export type SasaaCharts = {
  pdoc: SasaaChartPoint[];
  msl: SasaaMslMonths[];
  esg: Array<EsgMonthStatus | null>;
  engDb: SasaaEngDbStatus;
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

export type SasaaProjectDto = ProjectPhotosData & {
  project: SasaaProjectRef;
  metrics: SasaaMetrics;
  greenBuilding: SasaaGreenBuilding | null;
  knowledge: SasaaKnowledgePage;
  charts: SasaaCharts;
};

/** Backwards-compatible alias kept for the existing SASAA service imports. */
export type SasaaData = SasaaProjectDto;
