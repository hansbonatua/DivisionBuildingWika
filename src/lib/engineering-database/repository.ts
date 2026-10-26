import { and, asc, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { getPgDb } from "@/lib/pg/client";
import {
  engineeringDatabaseEntries,
  masterProjects,
  users,
  type NewPgEngineeringDatabaseEntry,
} from "@/lib/pg/schema";
import {
  ENGINEERING_DATABASE_PIC_ROLES,
  type EngineeringDatabaseCategory,
} from "@/lib/engineering-database/access";

export type EngineeringDatabaseEntryRow = {
  id: string;
  projectId: string;
  projectName: string;
  projectLocation: string;
  category: string;
  fileUrl: string;
  picUserId: string;
  picName: string;
  note: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type EngineeringDatabaseMutableData = Partial<
  Pick<NewPgEngineeringDatabaseEntry, "projectId" | "fileUrl" | "picUserId" | "note">
>;

export type EngineeringDatabasePicOptionRow = {
  id: string;
  name: string;
};

// Minimal project reference for the searchable picker: the canonical project
// id plus the two display fields. Project name/location are never stored on
// the entry row itself.
export type MasterProjectOptionRow = {
  id: string;
  name: string;
  location: string;
};

export type EngineeringDatabaseSummaryProjectRow = MasterProjectOptionRow;

export type EngineeringDatabaseSummaryEntryRow = {
  projectId: string;
  category: EngineeringDatabaseCategory;
};

const entryColumns = {
  id: engineeringDatabaseEntries.id,
  projectId: engineeringDatabaseEntries.projectId,
  projectName: masterProjects.name,
  projectLocation: masterProjects.location,
  category: engineeringDatabaseEntries.category,
  fileUrl: engineeringDatabaseEntries.fileUrl,
  picUserId: engineeringDatabaseEntries.picUserId,
  picName: users.name,
  note: engineeringDatabaseEntries.note,
  createdBy: engineeringDatabaseEntries.createdBy,
  createdAt: engineeringDatabaseEntries.createdAt,
  updatedAt: engineeringDatabaseEntries.updatedAt,
};

// Kept local (not imported from Master Project) so this module owns its read
// path against the canonical table and Master Project stays untouched.
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function entryQuery() {
  return getPgDb()
    .select(entryColumns)
    .from(engineeringDatabaseEntries)
    .innerJoin(
      masterProjects,
      eq(engineeringDatabaseEntries.projectId, masterProjects.id),
    )
    .innerJoin(users, eq(engineeringDatabaseEntries.picUserId, users.id));
}

// Category-scoped listing with an optional server-side project search. Search
// matches the canonical Master Project name/location only — never the file
// URL, PIC or note — using the same escaped ILIKE convention as the project
// picker (backed by the existing pg_trgm GIN indexes on master_projects).
export async function listEngineeringDatabaseEntryRows(
  category: EngineeringDatabaseCategory,
  q?: string,
): Promise<EngineeringDatabaseEntryRow[]> {
  const search = q?.trim();
  const searchFilter = search
    ? or(
        ilike(masterProjects.name, `%${escapeLikePattern(search)}%`),
        ilike(masterProjects.location, `%${escapeLikePattern(search)}%`),
      )
    : undefined;

  return entryQuery()
    .where(and(eq(engineeringDatabaseEntries.category, category), searchFilter))
    .orderBy(
      asc(masterProjects.name),
      asc(masterProjects.location),
      desc(engineeringDatabaseEntries.createdAt),
      asc(engineeringDatabaseEntries.id),
    );
}

export async function findEngineeringDatabaseEntryRowById(
  id: string,
): Promise<EngineeringDatabaseEntryRow | null> {
  const rows = await entryQuery()
    .where(eq(engineeringDatabaseEntries.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertEngineeringDatabaseEntry(
  data: NewPgEngineeringDatabaseEntry,
): Promise<string> {
  const rows = await getPgDb()
    .insert(engineeringDatabaseEntries)
    .values(data)
    .returning({ id: engineeringDatabaseEntries.id });
  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create Engineering Database entry");
  }
  return created.id;
}

export async function updateEngineeringDatabaseEntryRow(
  id: string,
  patch: EngineeringDatabaseMutableData,
): Promise<boolean> {
  const rows = await getPgDb()
    .update(engineeringDatabaseEntries)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(engineeringDatabaseEntries.id, id))
    .returning({ id: engineeringDatabaseEntries.id });
  return rows.length > 0;
}

export async function deleteEngineeringDatabaseEntryRow(
  id: string,
): Promise<boolean> {
  const rows = await getPgDb()
    .delete(engineeringDatabaseEntries)
    .where(eq(engineeringDatabaseEntries.id, id))
    .returning({ id: engineeringDatabaseEntries.id });
  return rows.length > 0;
}

// PIC eligibility is role-based only (Admin, Head Office, Project). Account
// status is intentionally NOT filtered in V1 — matching the existing PIC
// option queries.
export async function listEngineeringDatabasePicOptions(): Promise<
  EngineeringDatabasePicOptionRow[]
> {
  return getPgDb()
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.role, [...ENGINEERING_DATABASE_PIC_ROLES]))
    .orderBy(asc(users.name), asc(users.id));
}

// Server-side project search backed by the existing pg_trgm GIN indexes on
// master_projects.name / master_projects.location (created by migration 0004).
// SQL-level limit keeps the picker payload bounded.
export async function searchMasterProjectOptions(
  q: string | undefined,
  limit = 50,
): Promise<MasterProjectOptionRow[]> {
  const search = q?.trim();
  const base = getPgDb()
    .select({
      id: masterProjects.id,
      name: masterProjects.name,
      location: masterProjects.location,
    })
    .from(masterProjects);

  if (search) {
    const pattern = `%${escapeLikePattern(search)}%`;
    return base
      .where(
        or(
          ilike(masterProjects.name, pattern),
          ilike(masterProjects.location, pattern),
        ),
      )
      .orderBy(
        asc(masterProjects.name),
        asc(masterProjects.location),
        asc(masterProjects.id),
      )
      .limit(limit);
  }

  return base
    .orderBy(
      asc(masterProjects.name),
      asc(masterProjects.location),
      asc(masterProjects.id),
    )
    .limit(limit);
}

export async function findMasterProjectRef(
  id: string,
): Promise<MasterProjectOptionRow | null> {
  const rows = await getPgDb()
    .select({
      id: masterProjects.id,
      name: masterProjects.name,
      location: masterProjects.location,
    })
    .from(masterProjects)
    .where(eq(masterProjects.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// Summary inputs: every Master Project (so zero-record projects still appear)
// plus the existing (project, category) pairs — no per-cell counts in V1.
export async function listMasterProjectSummaryRows(): Promise<
  EngineeringDatabaseSummaryProjectRow[]
> {
  return getPgDb()
    .select({
      id: masterProjects.id,
      name: masterProjects.name,
      location: masterProjects.location,
    })
    .from(masterProjects)
    .orderBy(
      asc(masterProjects.name),
      asc(masterProjects.location),
      asc(masterProjects.id),
    );
}

export async function listEngineeringDatabaseSummaryPairs(): Promise<
  EngineeringDatabaseSummaryEntryRow[]
> {
  const rows = await getPgDb()
    .selectDistinct({
      projectId: engineeringDatabaseEntries.projectId,
      category: engineeringDatabaseEntries.category,
    })
    .from(engineeringDatabaseEntries);
  return rows.map((row) => ({
    projectId: row.projectId,
    category: row.category as EngineeringDatabaseCategory,
  }));
}
