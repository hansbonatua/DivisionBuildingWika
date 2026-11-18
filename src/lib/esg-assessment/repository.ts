import { and, asc, desc, eq, ilike } from "drizzle-orm";
import { getPgDb } from "@/lib/pg/client";
import {
  masterProjects,
  projectEsgAssessments,
  type NewPgProjectEsgAssessment,
} from "@/lib/pg/schema";

// Server-only persistence for Penilaian ESG. Project metadata is never stored
// on the assessment row; every read joins master_projects.

export type ProjectEsgAssessmentRow = {
  id: string;
  projectId: string;
  projectName: string;
  projectLocation: string;
  projectYear: number;
  year: number;
  documentationUrl: string | null;
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
  createdById: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectEsgAssessmentInsert = Pick<
  NewPgProjectEsgAssessment,
  "projectId" | "year" | "documentationUrl" | "createdBy"
>;

export type ProjectEsgAssessmentUpdate = Pick<
  NewPgProjectEsgAssessment,
  "projectId" | "year" | "documentationUrl" | "updatedBy"
>;

type MonthStatusColumn =
  | "month1Status"
  | "month2Status"
  | "month3Status"
  | "month4Status"
  | "month5Status"
  | "month6Status"
  | "month7Status"
  | "month8Status"
  | "month9Status"
  | "month10Status"
  | "month11Status"
  | "month12Status";

type MonthStatusPatch = Partial<
  Pick<NewPgProjectEsgAssessment, MonthStatusColumn>
>;

const esgColumns = {
  id: projectEsgAssessments.id,
  projectId: projectEsgAssessments.projectId,
  projectName: masterProjects.name,
  projectLocation: masterProjects.location,
  projectYear: masterProjects.year,
  year: projectEsgAssessments.year,
  documentationUrl: projectEsgAssessments.documentationUrl,
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
  createdById: projectEsgAssessments.createdBy,
  updatedById: projectEsgAssessments.updatedBy,
  createdAt: projectEsgAssessments.createdAt,
  updatedAt: projectEsgAssessments.updatedAt,
};

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function esgQuery() {
  return getPgDb()
    .select(esgColumns)
    .from(projectEsgAssessments)
    .innerJoin(
      masterProjects,
      eq(projectEsgAssessments.projectId, masterProjects.id),
    );
}

// `year` filters the snapshot year; `search` matches the canonical Master
// Project name only. `%` and `_` are escaped so user input stays literal.
export async function listProjectEsgAssessmentRows(
  year?: number,
  search?: string,
): Promise<ProjectEsgAssessmentRow[]> {
  const term = search?.trim();
  const conditions = [
    year !== undefined ? eq(projectEsgAssessments.year, year) : undefined,
    term ? ilike(masterProjects.name, `%${escapeLikePattern(term)}%`) : undefined,
  ].filter((condition) => condition !== undefined);

  return esgQuery()
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      desc(projectEsgAssessments.year),
      asc(masterProjects.name),
      asc(projectEsgAssessments.id),
    );
}

export async function findProjectEsgAssessmentRowById(
  id: string,
): Promise<ProjectEsgAssessmentRow | null> {
  const rows = await esgQuery()
    .where(eq(projectEsgAssessments.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function listAvailableEsgYears(): Promise<number[]> {
  const rows = await getPgDb()
    .selectDistinct({ year: projectEsgAssessments.year })
    .from(projectEsgAssessments)
    .orderBy(desc(projectEsgAssessments.year));
  return rows.map((row) => row.year);
}

export async function insertProjectEsgAssessment(
  data: ProjectEsgAssessmentInsert,
): Promise<string> {
  const rows = await getPgDb()
    .insert(projectEsgAssessments)
    .values({ ...data, updatedBy: null })
    .returning({ id: projectEsgAssessments.id });
  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create project ESG assessment");
  }
  return created.id;
}

export async function updateProjectEsgAssessmentRow(
  id: string,
  data: ProjectEsgAssessmentUpdate,
): Promise<boolean> {
  const rows = await getPgDb()
    .update(projectEsgAssessments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projectEsgAssessments.id, id))
    .returning({ id: projectEsgAssessments.id });
  return rows.length > 0;
}

// Explicit switch instead of a computed column name: it stays type-safe
// against the table definition and cannot silently write another month.
function monthStatusPatch(month: number, status: string | null): MonthStatusPatch {
  switch (month) {
    case 1:
      return { month1Status: status };
    case 2:
      return { month2Status: status };
    case 3:
      return { month3Status: status };
    case 4:
      return { month4Status: status };
    case 5:
      return { month5Status: status };
    case 6:
      return { month6Status: status };
    case 7:
      return { month7Status: status };
    case 8:
      return { month8Status: status };
    case 9:
      return { month9Status: status };
    case 10:
      return { month10Status: status };
    case 11:
      return { month11Status: status };
    case 12:
      return { month12Status: status };
    default:
      throw new Error(`Invalid ESG month: ${month}`);
  }
}

// Writes exactly one month column plus the audit pair. Idempotent: writing the
// value already stored still returns the row.
export async function updateProjectEsgMonthStatus(
  id: string,
  month: number,
  status: string | null,
  updatedBy: string,
): Promise<boolean> {
  const rows = await getPgDb()
    .update(projectEsgAssessments)
    .set({
      ...monthStatusPatch(month, status),
      updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(projectEsgAssessments.id, id))
    .returning({ id: projectEsgAssessments.id });
  return rows.length > 0;
}

export async function deleteProjectEsgAssessmentRow(
  id: string,
): Promise<boolean> {
  const rows = await getPgDb()
    .delete(projectEsgAssessments)
    .where(eq(projectEsgAssessments.id, id))
    .returning({ id: projectEsgAssessments.id });
  return rows.length > 0;
}
