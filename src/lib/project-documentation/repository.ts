import { and, asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getPgDb, type PgDatabase } from "@/lib/pg/client";
import {
  masterProjects,
  projectDocumentations,
  users,
} from "@/lib/pg/schema";

// Server-only persistence for Project Documentation (PDOC).
//
// Master Project is the driving table: a project without a documentation row
// still appears in the list. The five week uploaders are resolved in the same
// query through aliases, so the list never performs a query per project or per
// week.

export type ProjectDocumentationDb = PgDatabase;

function dbOrDefault(db?: ProjectDocumentationDb): ProjectDocumentationDb {
  return db ?? getPgDb();
}

export type ProjectDocumentationRecord = {
  id: string;
  projectId: string;
  year: number;
  month: number;
  week1Url: string | null;
  week1UpdatedBy: string | null;
  week1UpdatedAt: Date | null;
  week2Url: string | null;
  week2UpdatedBy: string | null;
  week2UpdatedAt: Date | null;
  week3Url: string | null;
  week3UpdatedBy: string | null;
  week3UpdatedAt: Date | null;
  week4Url: string | null;
  week4UpdatedBy: string | null;
  week4UpdatedAt: Date | null;
  week5Url: string | null;
  week5UpdatedBy: string | null;
  week5UpdatedAt: Date | null;
  catatan: string | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectDocumentationListRow = {
  projectId: string;
  documentationId: string | null;
  projectName: string;
  projectLocation: string;
  projectYear: number;
  week1Url: string | null;
  week1UpdatedById: string | null;
  week1UpdatedByName: string | null;
  week1UpdatedAt: Date | null;
  week2Url: string | null;
  week2UpdatedById: string | null;
  week2UpdatedByName: string | null;
  week2UpdatedAt: Date | null;
  week3Url: string | null;
  week3UpdatedById: string | null;
  week3UpdatedByName: string | null;
  week3UpdatedAt: Date | null;
  week4Url: string | null;
  week4UpdatedById: string | null;
  week4UpdatedByName: string | null;
  week4UpdatedAt: Date | null;
  week5Url: string | null;
  week5UpdatedById: string | null;
  week5UpdatedByName: string | null;
  week5UpdatedAt: Date | null;
  catatan: string | null;
  updatedById: string | null;
  updatedByName: string | null;
  updatedAt: Date | null;
};

export type ProjectDocumentationSummaryRow = {
  projectId: string;
  projectName: string;
  projectLocation: string;
  projectYear: number;
  documentationId: string | null;
  month: number | null;
  week1Url: string | null;
  week2Url: string | null;
  week3Url: string | null;
  week4Url: string | null;
  week5Url: string | null;
};

export type ProjectDocumentationUpdate = {
  week1Url?: string | null;
  week2Url?: string | null;
  week3Url?: string | null;
  week4Url?: string | null;
  week5Url?: string | null;
  catatan?: string | null;
};

export type ProjectDocumentationWriteValues = {
  week1Url: string | null;
  week1UpdatedBy: string | null;
  week1UpdatedAt: Date | null;
  week2Url: string | null;
  week2UpdatedBy: string | null;
  week2UpdatedAt: Date | null;
  week3Url: string | null;
  week3UpdatedBy: string | null;
  week3UpdatedAt: Date | null;
  week4Url: string | null;
  week4UpdatedBy: string | null;
  week4UpdatedAt: Date | null;
  week5Url: string | null;
  week5UpdatedBy: string | null;
  week5UpdatedAt: Date | null;
  catatan: string | null;
  updatedBy: string | null;
  updatedAt: Date;
};

export type ProjectDocumentationWritePlan = {
  values: ProjectDocumentationWriteValues;
  changed: boolean;
};

export type ProjectRef = {
  id: string;
  name: string;
};

const week1User = alias(users, "pdoc_week_1_user");
const week2User = alias(users, "pdoc_week_2_user");
const week3User = alias(users, "pdoc_week_3_user");
const week4User = alias(users, "pdoc_week_4_user");
const week5User = alias(users, "pdoc_week_5_user");
const rowUpdater = alias(users, "pdoc_row_updater");

const documentationColumns = {
  id: projectDocumentations.id,
  projectId: projectDocumentations.projectId,
  year: projectDocumentations.year,
  month: projectDocumentations.month,
  week1Url: projectDocumentations.week1Url,
  week1UpdatedBy: projectDocumentations.week1UpdatedBy,
  week1UpdatedAt: projectDocumentations.week1UpdatedAt,
  week2Url: projectDocumentations.week2Url,
  week2UpdatedBy: projectDocumentations.week2UpdatedBy,
  week2UpdatedAt: projectDocumentations.week2UpdatedAt,
  week3Url: projectDocumentations.week3Url,
  week3UpdatedBy: projectDocumentations.week3UpdatedBy,
  week3UpdatedAt: projectDocumentations.week3UpdatedAt,
  week4Url: projectDocumentations.week4Url,
  week4UpdatedBy: projectDocumentations.week4UpdatedBy,
  week4UpdatedAt: projectDocumentations.week4UpdatedAt,
  week5Url: projectDocumentations.week5Url,
  week5UpdatedBy: projectDocumentations.week5UpdatedBy,
  week5UpdatedAt: projectDocumentations.week5UpdatedAt,
  catatan: projectDocumentations.catatan,
  createdBy: projectDocumentations.createdBy,
  updatedBy: projectDocumentations.updatedBy,
  createdAt: projectDocumentations.createdAt,
  updatedAt: projectDocumentations.updatedAt,
};

const listColumns = {
  projectId: masterProjects.id,
  documentationId: projectDocumentations.id,
  projectName: masterProjects.name,
  projectLocation: masterProjects.location,
  projectYear: masterProjects.year,
  week1Url: projectDocumentations.week1Url,
  week1UpdatedById: projectDocumentations.week1UpdatedBy,
  week1UpdatedByName: week1User.name,
  week1UpdatedAt: projectDocumentations.week1UpdatedAt,
  week2Url: projectDocumentations.week2Url,
  week2UpdatedById: projectDocumentations.week2UpdatedBy,
  week2UpdatedByName: week2User.name,
  week2UpdatedAt: projectDocumentations.week2UpdatedAt,
  week3Url: projectDocumentations.week3Url,
  week3UpdatedById: projectDocumentations.week3UpdatedBy,
  week3UpdatedByName: week3User.name,
  week3UpdatedAt: projectDocumentations.week3UpdatedAt,
  week4Url: projectDocumentations.week4Url,
  week4UpdatedById: projectDocumentations.week4UpdatedBy,
  week4UpdatedByName: week4User.name,
  week4UpdatedAt: projectDocumentations.week4UpdatedAt,
  week5Url: projectDocumentations.week5Url,
  week5UpdatedById: projectDocumentations.week5UpdatedBy,
  week5UpdatedByName: week5User.name,
  week5UpdatedAt: projectDocumentations.week5UpdatedAt,
  catatan: projectDocumentations.catatan,
  updatedById: projectDocumentations.updatedBy,
  updatedByName: rowUpdater.name,
  updatedAt: projectDocumentations.updatedAt,
};

function baseListQuery(
  db: ProjectDocumentationDb,
  year: number,
  month: number,
) {
  return db
    .select(listColumns)
    .from(masterProjects)
    .leftJoin(
      projectDocumentations,
      and(
        eq(projectDocumentations.projectId, masterProjects.id),
        eq(projectDocumentations.year, year),
        eq(projectDocumentations.month, month),
      ),
    )
    .leftJoin(
      week1User,
      eq(projectDocumentations.week1UpdatedBy, week1User.id),
    )
    .leftJoin(
      week2User,
      eq(projectDocumentations.week2UpdatedBy, week2User.id),
    )
    .leftJoin(
      week3User,
      eq(projectDocumentations.week3UpdatedBy, week3User.id),
    )
    .leftJoin(
      week4User,
      eq(projectDocumentations.week4UpdatedBy, week4User.id),
    )
    .leftJoin(
      week5User,
      eq(projectDocumentations.week5UpdatedBy, week5User.id),
    )
    .leftJoin(rowUpdater, eq(projectDocumentations.updatedBy, rowUpdater.id));
}

export async function listProjectDocumentations(
  year: number,
  month: number,
  db: ProjectDocumentationDb = dbOrDefault(),
): Promise<ProjectDocumentationListRow[]> {
  return baseListQuery(db, year, month).orderBy(
    asc(masterProjects.name),
    asc(masterProjects.location),
    asc(masterProjects.id),
  );
}

export async function findProjectDocumentationViewByPeriod(
  projectId: string,
  year: number,
  month: number,
  db: ProjectDocumentationDb = dbOrDefault(),
): Promise<ProjectDocumentationListRow | null> {
  const rows = await baseListQuery(db, year, month)
    .where(eq(masterProjects.id, projectId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findProjectDocumentationByPeriod(
  projectId: string,
  year: number,
  month: number,
  db: ProjectDocumentationDb = dbOrDefault(),
): Promise<ProjectDocumentationRecord | null> {
  const rows = await db
    .select(documentationColumns)
    .from(projectDocumentations)
    .where(
      and(
        eq(projectDocumentations.projectId, projectId),
        eq(projectDocumentations.year, year),
        eq(projectDocumentations.month, month),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function findProjectById(
  projectId: string,
  db: ProjectDocumentationDb = dbOrDefault(),
): Promise<ProjectRef | null> {
  const rows = await db
    .select({ id: masterProjects.id, name: masterProjects.name })
    .from(masterProjects)
    .where(eq(masterProjects.id, projectId))
    .limit(1);
  return rows[0] ?? null;
}

export async function listDocumentationYears(
  db: ProjectDocumentationDb = dbOrDefault(),
): Promise<number[]> {
  const rows = await db
    .selectDistinct({ year: projectDocumentations.year })
    .from(projectDocumentations)
    .orderBy(desc(projectDocumentations.year));
  return rows.map((row) => row.year);
}

// Summary rows are deliberately raw project-month rows. The service expands
// them to twelve months and counts the five URL slots, keeping aggregation
// deterministic and testable without a database.
export async function getDocumentationSummary(
  year: number,
  db: ProjectDocumentationDb = dbOrDefault(),
): Promise<ProjectDocumentationSummaryRow[]> {
  return db
    .select({
      projectId: masterProjects.id,
      projectName: masterProjects.name,
      projectLocation: masterProjects.location,
      projectYear: masterProjects.year,
      documentationId: projectDocumentations.id,
      month: projectDocumentations.month,
      week1Url: projectDocumentations.week1Url,
      week2Url: projectDocumentations.week2Url,
      week3Url: projectDocumentations.week3Url,
      week4Url: projectDocumentations.week4Url,
      week5Url: projectDocumentations.week5Url,
    })
    .from(masterProjects)
    .leftJoin(
      projectDocumentations,
      and(
        eq(projectDocumentations.projectId, masterProjects.id),
        eq(projectDocumentations.year, year),
      ),
    )
    .orderBy(
      asc(masterProjects.name),
      asc(masterProjects.location),
      asc(masterProjects.id),
      asc(projectDocumentations.month),
    );
}

type WeekWrite = {
  url: string | null;
  updatedBy: string | null;
  updatedAt: Date | null;
  changed: boolean;
};

// One week's audit transition:
// - omitted        -> keep URL and audit metadata
// - same value     -> keep metadata (no timestamp churn)
// - changed to URL -> actor + now
// - cleared        -> URL, actor and timestamp all NULL (D-PDOC-02)
function buildWeekWrite(
  previousUrl: string | null,
  previousUpdatedBy: string | null,
  previousUpdatedAt: Date | null,
  providedUrl: string | null | undefined,
  actorId: string,
  now: Date,
): WeekWrite {
  if (providedUrl === undefined) {
    return {
      url: previousUrl,
      updatedBy: previousUpdatedBy,
      updatedAt: previousUpdatedAt,
      changed: false,
    };
  }
  if (providedUrl === previousUrl) {
    return {
      url: previousUrl,
      updatedBy: previousUpdatedBy,
      updatedAt: previousUpdatedAt,
      changed: false,
    };
  }
  if (providedUrl === null) {
    return { url: null, updatedBy: null, updatedAt: null, changed: true };
  }
  return {
    url: providedUrl,
    updatedBy: actorId,
    updatedAt: now,
    changed: true,
  };
}

// Pure transition builder, exported so the audit rules can be tested without a
// database. The repository below only persists the returned values.
export function buildProjectDocumentationWrite(
  existing: ProjectDocumentationRecord | null,
  data: ProjectDocumentationUpdate,
  actorId: string,
  now: Date,
): ProjectDocumentationWritePlan {
  const week1 = buildWeekWrite(
    existing?.week1Url ?? null,
    existing?.week1UpdatedBy ?? null,
    existing?.week1UpdatedAt ?? null,
    data.week1Url,
    actorId,
    now,
  );
  const week2 = buildWeekWrite(
    existing?.week2Url ?? null,
    existing?.week2UpdatedBy ?? null,
    existing?.week2UpdatedAt ?? null,
    data.week2Url,
    actorId,
    now,
  );
  const week3 = buildWeekWrite(
    existing?.week3Url ?? null,
    existing?.week3UpdatedBy ?? null,
    existing?.week3UpdatedAt ?? null,
    data.week3Url,
    actorId,
    now,
  );
  const week4 = buildWeekWrite(
    existing?.week4Url ?? null,
    existing?.week4UpdatedBy ?? null,
    existing?.week4UpdatedAt ?? null,
    data.week4Url,
    actorId,
    now,
  );
  const week5 = buildWeekWrite(
    existing?.week5Url ?? null,
    existing?.week5UpdatedBy ?? null,
    existing?.week5UpdatedAt ?? null,
    data.week5Url,
    actorId,
    now,
  );

  const catatanProvided = data.catatan !== undefined;
  const catatan = catatanProvided ? data.catatan ?? null : existing?.catatan ?? null;
  const catatanChanged =
    catatanProvided && catatan !== (existing?.catatan ?? null);

  return {
    changed:
      existing === null ||
      week1.changed ||
      week2.changed ||
      week3.changed ||
      week4.changed ||
      week5.changed ||
      catatanChanged,
    values: {
      week1Url: week1.url,
      week1UpdatedBy: week1.updatedBy,
      week1UpdatedAt: week1.updatedAt,
      week2Url: week2.url,
      week2UpdatedBy: week2.updatedBy,
      week2UpdatedAt: week2.updatedAt,
      week3Url: week3.url,
      week3UpdatedBy: week3.updatedBy,
      week3UpdatedAt: week3.updatedAt,
      week4Url: week4.url,
      week4UpdatedBy: week4.updatedBy,
      week4UpdatedAt: week4.updatedAt,
      week5Url: week5.url,
      week5UpdatedBy: week5.updatedBy,
      week5UpdatedAt: week5.updatedAt,
      catatan,
      updatedBy: actorId,
      updatedAt: now,
    },
  };
}

export async function upsertProjectDocumentation(
  projectId: string,
  year: number,
  month: number,
  data: ProjectDocumentationUpdate,
  actorId: string,
  db: ProjectDocumentationDb = dbOrDefault(),
): Promise<ProjectDocumentationRecord> {
  const existing = await findProjectDocumentationByPeriod(
    projectId,
    year,
    month,
    db,
  );
  const now = new Date();
  const plan = buildProjectDocumentationWrite(existing, data, actorId, now);

  // A no-op save must not move any timestamp.
  if (existing && !plan.changed) {
    return existing;
  }

  if (existing) {
    await db
      .update(projectDocumentations)
      .set(plan.values)
      .where(
        and(
          eq(projectDocumentations.projectId, projectId),
          eq(projectDocumentations.year, year),
          eq(projectDocumentations.month, month),
        ),
      );
  } else {
    await db
      .insert(projectDocumentations)
      .values({
        projectId,
        year,
        month,
        ...plan.values,
        createdBy: actorId,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: [
          projectDocumentations.projectId,
          projectDocumentations.year,
          projectDocumentations.month,
        ],
        set: plan.values,
      });
  }

  const saved = await findProjectDocumentationByPeriod(
    projectId,
    year,
    month,
    db,
  );
  if (!saved) {
    throw new Error("Failed to read Project Documentation");
  }
  return saved;
}
