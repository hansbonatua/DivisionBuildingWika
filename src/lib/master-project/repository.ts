import { and, asc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { getPgDb, type PgDatabase } from "@/lib/pg/client";
import {
  masterProjects,
  projectPhotos,
  users,
  type NewPgMasterProject,
} from "@/lib/pg/schema";
import { ADMIN_ROLE, HEAD_OFFICE_ROLE } from "@/lib/users/roles";

export type MasterProjectRow = {
  id: string;
  name: string;
  location: string;
  year: number;
  picUserId: string;
  picName: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

type PgTransaction = Parameters<Parameters<PgDatabase["transaction"]>[0]>[0];
export type MasterProjectDb = PgDatabase | PgTransaction;

function dbOrDefault(db?: MasterProjectDb): MasterProjectDb {
  return db ?? getPgDb();
}

export type MasterProjectPicOptionRow = {
  id: string;
  name: string;
};

export type MasterProjectMutableData = Partial<
  Pick<NewPgMasterProject, "name" | "location" | "year" | "picUserId">
>;

const masterProjectColumns = {
  id: masterProjects.id,
  name: masterProjects.name,
  location: masterProjects.location,
  year: masterProjects.year,
  picUserId: masterProjects.picUserId,
  picName: users.name,
  createdBy: masterProjects.createdBy,
  createdAt: masterProjects.createdAt,
  updatedAt: masterProjects.updatedAt,
};

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function listMasterProjects({
  q,
}: {
  q?: string;
} = {}): Promise<MasterProjectRow[]> {
  const search = q?.trim();
  const query = getPgDb()
    .select(masterProjectColumns)
    .from(masterProjects)
    .innerJoin(users, eq(masterProjects.picUserId, users.id));

  if (search) {
    const pattern = `%${escapeLikePattern(search)}%`;
    return query
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
      );
  }

  return query.orderBy(
    asc(masterProjects.name),
    asc(masterProjects.location),
    asc(masterProjects.id),
  );
}

export async function getMasterProjectById(
  id: string,
): Promise<MasterProjectRow | null> {
  const rows = await getPgDb()
    .select(masterProjectColumns)
    .from(masterProjects)
    .innerJoin(users, eq(masterProjects.picUserId, users.id))
    .where(eq(masterProjects.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function findDuplicateMasterProject(
  name: string,
  location: string,
  excludeId?: string,
): Promise<{ id: string } | null> {
  const conditions = [
    sql`lower(btrim(${masterProjects.name})) = lower(btrim(${name}))`,
    sql`lower(btrim(${masterProjects.location})) = lower(btrim(${location}))`,
  ];
  if (excludeId) {
    conditions.push(ne(masterProjects.id, excludeId));
  }

  const rows = await getPgDb()
    .select({ id: masterProjects.id })
    .from(masterProjects)
    .where(and(...conditions))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertMasterProject(
  data: NewPgMasterProject,
  db: MasterProjectDb = dbOrDefault(),
): Promise<string> {
  const rows = await db
    .insert(masterProjects)
    .values(data)
    .returning({ id: masterProjects.id });
  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create Master Project");
  }
  return created.id;
}

export async function updateMasterProjectRow(
  id: string,
  data: MasterProjectMutableData,
  db: MasterProjectDb = dbOrDefault(),
): Promise<boolean> {
  const rows = await db
    .update(masterProjects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(masterProjects.id, id))
    .returning({ id: masterProjects.id });
  return rows.length > 0;
}

export async function listProjectPhotoPathnames(
  projectId: string,
): Promise<string[]> {
  const rows = await getPgDb()
    .select({ blobPathname: projectPhotos.blobPathname })
    .from(projectPhotos)
    .where(eq(projectPhotos.projectId, projectId));
  return rows.map((row) => row.blobPathname);
}

export async function deleteMasterProjectRow(
  id: string,
  db: MasterProjectDb = dbOrDefault(),
): Promise<boolean> {
  const rows = await db
    .delete(masterProjects)
    .where(eq(masterProjects.id, id))
    .returning({ id: masterProjects.id });
  return rows.length > 0;
}

export async function listMasterProjectPicOptions(): Promise<
  MasterProjectPicOptionRow[]
> {
  return getPgDb()
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.role, [ADMIN_ROLE, HEAD_OFFICE_ROLE]))
    .orderBy(asc(users.name), asc(users.id));
}
