import { and, desc, eq, sql } from "drizzle-orm";
import { getPgDb, type PgDatabase } from "@/lib/pg/client";
import {
  engineeringDatabaseEntries,
  knowledgeEntries,
  masterProjects,
  mslAssessments,
  projectDocumentations,
  projectEsgAssessments,
  projectGreenCertificates,
} from "@/lib/pg/schema";
import { ENGINEERING_DATABASE_CATEGORIES } from "@/lib/engineering-database/access";
import {
  isEsgMonthStatus,
  type EsgMonthStatus,
} from "@/lib/esg-assessment/constants";
import {
  KNOWLEDGE_TYPES,
  type KnowledgeType,
} from "@/lib/knowledge-management/schema";
import { computeMslScore } from "@/lib/msl/score";
import type {
  SasaaChartPoint,
  SasaaEngDbStatus,
  SasaaGreenBuilding,
  SasaaKnowledgeItem,
  SasaaKnowledgePage,
  SasaaMslMonths,
} from "@/lib/sasaa/types";

// SASAA aggregate reads (backend Step 1).
//
// One function per chart/section, each a SINGLE query for the whole project
// period — never one query per month or per category. Pure builders are
// exported alongside the query functions so the shaping rules (empty month,
// category mapping, paging offsets) are testable without a database.
//
// `db` is injectable (defaulting to the shared pool) exactly like the other
// enterprise repositories, so tests can drive the functions with row fixtures.

export const SASAA_MONTH_COUNT = 12;
export const SASAA_KNOWLEDGE_PER_CATEGORY = 3;
export const SASAA_PDOC_WEEK_COUNT = 5;

// numeric(3,2) arrives as a string from the postgres driver. @/lib/msl/
// repository has the same conversion, but it is module-private there, so this
// module keeps its own copy instead of exporting internals of another module.
function toNumber(value: string | number | null): number {
  if (value === null) return 0;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function emptyMonths<T>(factory: () => T): T[] {
  return Array.from({ length: SASAA_MONTH_COUNT }, factory);
}

type PdocMonthRow = {
  month: number;
  week1Url: string | null;
  week2Url: string | null;
  week3Url: string | null;
  week4Url: string | null;
  week5Url: string | null;
};

/** Filled week slots per month (0..5). A month without a row stays 0. */
export function buildPdocMonths(rows: PdocMonthRow[]): SasaaChartPoint[] {
  const points: SasaaChartPoint[] = Array.from(
    { length: SASAA_MONTH_COUNT },
    (_, index) => ({ month: index + 1, value: 0 }),
  );

  for (const row of rows) {
    if (!Number.isInteger(row.month) || row.month < 1 || row.month > SASAA_MONTH_COUNT) {
      continue;
    }
    const value = [
      row.week1Url,
      row.week2Url,
      row.week3Url,
      row.week4Url,
      row.week5Url,
    ].filter((url) => Boolean(url)).length;
    points[row.month - 1] = { month: row.month, value };
  }

  return points;
}

type MslMonthRow = {
  assessmentMonth: number;
  engineeringValue: string | number | null;
  metodeKerja: string | number | null;
  engineeringExecution: string | number | null;
};

/**
 * Twelve MSL months. `total` is the canonical score (average of the three
 * components, two decimals) so the chart can never disagree with the table.
 * A month without an assessment is all zeros.
 */
export function buildMslMonths(rows: MslMonthRow[]): SasaaMslMonths[] {
  const months = emptyMonths<SasaaMslMonths>(() => ({
    total: 0,
    engineeringValue: 0,
    metodeKerja: 0,
    engineeringExecution: 0,
  }));

  for (const row of rows) {
    if (
      !Number.isInteger(row.assessmentMonth) ||
      row.assessmentMonth < 1 ||
      row.assessmentMonth > SASAA_MONTH_COUNT
    ) {
      continue;
    }
    const engineeringValue = toNumber(row.engineeringValue);
    const metodeKerja = toNumber(row.metodeKerja);
    const engineeringExecution = toNumber(row.engineeringExecution);
    months[row.assessmentMonth - 1] = {
      total: computeMslScore({
        engineeringValue,
        metodeKerja,
        engineeringExecution,
      }),
      engineeringValue,
      metodeKerja,
      engineeringExecution,
    };
  }

  return months;
}

type EsgMonthRow = {
  month1Status: string | null;
  month2Status: string | null;
  month3Status: string | null;
  month4Status: string | null;
  month5Status: string | null;
  month6Status: string | null;
  month7Status: string | null;
  month8Status: string | null;
  month9Status: string | null;
  month10Status: string | null;
  month11Status: string | null;
  month12Status: string | null;
};

/** Twelve ESG cells: 'Complete', 'Half', or null when the cell is empty. */
export function buildEsgMonths(
  row: EsgMonthRow | null | undefined,
): Array<EsgMonthStatus | null> {
  if (!row) {
    return emptyMonths<EsgMonthStatus | null>(() => null);
  }
  const values: Array<string | null> = [
    row.month1Status,
    row.month2Status,
    row.month3Status,
    row.month4Status,
    row.month5Status,
    row.month6Status,
    row.month7Status,
    row.month8Status,
    row.month9Status,
    row.month10Status,
    row.month11Status,
    row.month12Status,
  ];
  return values.map((value) => (isEsgMonthStatus(value) ? value : null));
}

type GreenBuildingRow = {
  lembaga: string;
  level: string;
  status: string;
  certificateYear: number;
  documentationUrl: string | null;
};

/** Highest certificate_year wins, regardless of input order. */
export function pickLatestGreenBuilding(
  rows: GreenBuildingRow[],
): SasaaGreenBuilding | null {
  let latest: GreenBuildingRow | null = null;
  for (const row of rows) {
    if (!latest || row.certificateYear > latest.certificateYear) {
      latest = row;
    }
  }
  if (!latest) {
    return null;
  }
  return {
    lembaga: latest.lembaga,
    level: latest.level,
    status: latest.status,
    certificateYear: latest.certificateYear,
    documentationUrl: latest.documentationUrl,
  };
}

const KNOWLEDGE_COUNT_KEYS: Record<
  KnowledgeType,
  "lessonLearn" | "bestPractice" | "vaVe"
> = {
  lesson_learn: "lessonLearn",
  best_practice: "bestPractice",
  va_ve: "vaVe",
};

type KnowledgeCountRow = { knowledgeType: string; total: number | string };

/** Counts cover the whole project; hasMore compares them with the page window. */
export function buildKnowledgePage(
  countRows: KnowledgeCountRow[],
  itemsByCategory: Record<KnowledgeType, SasaaKnowledgeItem[]>,
  page: number,
  perCategory: number,
): SasaaKnowledgePage {
  const counts = {
    total: 0,
    lessonLearn: 0,
    bestPractice: 0,
    vaVe: 0,
  };

  for (const row of countRows) {
    const total = Number(row.total);
    if (!Number.isFinite(total)) {
      continue;
    }
    counts.total += total;
    if (row.knowledgeType === "lesson_learn") counts.lessonLearn = total;
    if (row.knowledgeType === "best_practice") counts.bestPractice = total;
    if (row.knowledgeType === "va_ve") counts.vaVe = total;
  }

  const seen = page * perCategory;
  const hasMore = KNOWLEDGE_TYPES.some(
    (type) => counts[KNOWLEDGE_COUNT_KEYS[type]] > seen,
  );

  return {
    counts,
    byCategory: itemsByCategory,
    page,
    perCategory,
    hasMore,
  };
}

/**
 * Documentation coverage per month for one project year. The year is the
 * documentation year (project_documentations.year), not master_projects.year.
 */
export async function getPdocMonths(
  projectId: string,
  year: number,
  db: PgDatabase = getPgDb(),
): Promise<SasaaChartPoint[]> {
  const rows = await db
    .select({
      month: projectDocumentations.month,
      week1Url: projectDocumentations.week1Url,
      week2Url: projectDocumentations.week2Url,
      week3Url: projectDocumentations.week3Url,
      week4Url: projectDocumentations.week4Url,
      week5Url: projectDocumentations.week5Url,
    })
    .from(projectDocumentations)
    .where(
      and(
        eq(projectDocumentations.projectId, projectId),
        eq(projectDocumentations.year, year),
      ),
    );

  return buildPdocMonths(rows);
}

/**
 * MSL score per month. msl_assessments has no year column: the year is always
 * master_projects.year, so the filter joins the canonical project row.
 */
export async function getMslMonths(
  projectId: string,
  year: number,
  db: PgDatabase = getPgDb(),
): Promise<SasaaMslMonths[]> {
  const rows = await db
    .select({
      assessmentMonth: mslAssessments.assessmentMonth,
      engineeringValue: mslAssessments.engineeringValue,
      metodeKerja: mslAssessments.metodeKerja,
      engineeringExecution: mslAssessments.engineeringExecution,
    })
    .from(mslAssessments)
    .innerJoin(masterProjects, eq(mslAssessments.projectId, masterProjects.id))
    .where(
      and(
        eq(mslAssessments.projectId, projectId),
        eq(masterProjects.year, year),
      ),
    );

  return buildMslMonths(rows);
}

/** ESG month cells for one project year (one row per project per year). */
export async function getEsgMonths(
  projectId: string,
  year: number,
  db: PgDatabase = getPgDb(),
): Promise<Array<EsgMonthStatus | null>> {
  const rows = await db
    .select({
      month1Status: projectEsgAssessments.month1Status,
      month2Status: projectEsgAssessments.month2Status,
      month3Status: projectEsgAssessments.month3Status,
      month4Status: projectEsgAssessments.month4Status,
      month5Status: projectEsgAssessments.month5Status,
      month6Status: projectEsgAssessments.month6Status,
      month7Status: projectEsgAssessments.month7Status,
      month8Status: projectEsgAssessments.month8Status,
      month9Status: projectEsgAssessments.month9Status,
      month10Status: projectEsgAssessments.month10Status,
      month11Status: projectEsgAssessments.month11Status,
      month12Status: projectEsgAssessments.month12Status,
    })
    .from(projectEsgAssessments)
    .where(
      and(
        eq(projectEsgAssessments.projectId, projectId),
        eq(projectEsgAssessments.year, year),
      ),
    )
    .limit(1);

  return buildEsgMonths(rows[0]);
}

/** Latest certificate of the project (certificate_year DESC). */
export async function getGreenBuilding(
  projectId: string,
  db: PgDatabase = getPgDb(),
): Promise<SasaaGreenBuilding | null> {
  const rows = await db
    .select({
      lembaga: projectGreenCertificates.lembaga,
      level: projectGreenCertificates.level,
      status: projectGreenCertificates.status,
      certificateYear: projectGreenCertificates.certificateYear,
      documentationUrl: projectGreenCertificates.documentationUrl,
    })
    .from(projectGreenCertificates)
    .where(eq(projectGreenCertificates.projectId, projectId))
    .orderBy(desc(projectGreenCertificates.certificateYear))
    .limit(1);

  return pickLatestGreenBuilding(rows);
}

/**
 * Knowledge Management page: project-wide counts (one grouped query) plus one
 * bounded query per submenu. Four queries total regardless of page or data
 * size — never one query per record.
 */
export async function getKnowledgeSummary(
  projectId: string,
  page: number,
  perCategory: number = SASAA_KNOWLEDGE_PER_CATEGORY,
  db: PgDatabase = getPgDb(),
): Promise<SasaaKnowledgePage> {
  const safePage = Number.isInteger(page) && page >= 1 ? page : 1;
  const safePerCategory =
    Number.isInteger(perCategory) && perCategory >= 1
      ? perCategory
      : SASAA_KNOWLEDGE_PER_CATEGORY;
  const offset = (safePage - 1) * safePerCategory;

  const countRows = await db
    .select({
      knowledgeType: knowledgeEntries.knowledgeType,
      total: sql<number>`count(*)::int`,
    })
    .from(knowledgeEntries)
    .where(eq(knowledgeEntries.projectId, projectId))
    .groupBy(knowledgeEntries.knowledgeType);

  const [lessonLearn, bestPractice, vaVe] = await Promise.all(
    KNOWLEDGE_TYPES.map((knowledgeType) =>
      db
        .select({
          id: knowledgeEntries.id,
          content: knowledgeEntries.content,
        })
        .from(knowledgeEntries)
        .where(
          and(
            eq(knowledgeEntries.projectId, projectId),
            eq(knowledgeEntries.knowledgeType, knowledgeType),
          ),
        )
        .orderBy(desc(knowledgeEntries.createdAt), desc(knowledgeEntries.id))
        .limit(safePerCategory)
        .offset(offset),
    ),
  );

  return buildKnowledgePage(
    countRows,
    {
      lesson_learn: lessonLearn,
      best_practice: bestPractice,
      va_ve: vaVe,
    },
    safePage,
    safePerCategory,
  );
}

/**
 * Engineering Database coverage against the canonical category list from
 * @/lib/engineering-database/access. Rows with an unknown category are ignored
 * rather than inventing an extra bucket.
 */
export async function getEngDbStatus(
  projectId: string,
  db: PgDatabase = getPgDb(),
): Promise<SasaaEngDbStatus> {
  const rows = await db
    .select({ category: engineeringDatabaseEntries.category })
    .from(engineeringDatabaseEntries)
    .where(eq(engineeringDatabaseEntries.projectId, projectId))
    .groupBy(engineeringDatabaseEntries.category);

  const covered = new Set(rows.map((row) => row.category));
  const categories = ENGINEERING_DATABASE_CATEGORIES.map((category) => ({
    category,
    covered: covered.has(category),
  }));

  return {
    covered: categories.filter((entry) => entry.covered).length,
    total: ENGINEERING_DATABASE_CATEGORIES.length,
    categories,
  };
}
