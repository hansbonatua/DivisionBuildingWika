import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { getPgDb, type PgDatabase } from "@/lib/pg/client";
import {
  knowledgeEntries,
  knowledgeEvidence,
  knowledgePics,
  masterProjects,
  users,
  type PgUser,
} from "@/lib/pg/schema";
import { HEAD_OFFICE_ROLE } from "@/lib/users/roles";
import type { EvidenceItemInput, KnowledgeType } from "@/lib/knowledge-management/schema";

// Server-only persistence for Knowledge Management V2. Business policy
// (permission, project/PIC existence, Head Office eligibility) belongs to the
// service; this module only performs query construction and transaction-local
// reads/writes.

type PgTransaction = Parameters<Parameters<PgDatabase["transaction"]>[0]>[0];

export type KnowledgeDb = PgDatabase | PgTransaction;

function dbOrDefault(db?: KnowledgeDb): KnowledgeDb {
  return db ?? getPgDb();
}

export type KnowledgeEvidenceRow = {
  id: string;
  name: string;
  url: string;
};

export type KnowledgePicRow = {
  id: string;
  name: string;
  status: string;
};

export type KnowledgeUserRef = {
  id: string;
  name: string;
};

export type KnowledgeProjectSummary = {
  id: string;
  name: string;
  location: string;
  year: number;
};

export type KnowledgeRecordRow = {
  id: string;
  project: KnowledgeProjectSummary;
  knowledgeType: KnowledgeType;
  content: string;
  pics: KnowledgePicRow[];
  evidence: KnowledgeEvidenceRow;
  version: number;
  createdBy: KnowledgeUserRef;
  createdAt: string;
  updatedBy: KnowledgeUserRef | null;
  updatedAt: string;
};

type TimestampColumn =
  | typeof knowledgeEntries.createdAt
  | typeof knowledgeEntries.updatedAt;

const ISO_TIMESTAMP = (column: TimestampColumn) =>
  sql<string>`to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

async function loadRecordRows(
  where: SQL,
  db: KnowledgeDb,
): Promise<KnowledgeRecordRow[]> {
  const rows = await db
    .select({
      id: knowledgeEntries.id,
      projectId: masterProjects.id,
      projectName: masterProjects.name,
      projectLocation: masterProjects.location,
      projectYear: masterProjects.year,
      knowledgeType: knowledgeEntries.knowledgeType,
      content: knowledgeEntries.content,
      version: knowledgeEntries.version,
      createdById: knowledgeEntries.createdBy,
      updatedById: knowledgeEntries.updatedBy,
      createdAt: ISO_TIMESTAMP(knowledgeEntries.createdAt),
      updatedAt: ISO_TIMESTAMP(knowledgeEntries.updatedAt),
      evidenceId: knowledgeEvidence.id,
      evidenceName: knowledgeEvidence.name,
      evidenceUrl: knowledgeEvidence.url,
    })
    .from(knowledgeEntries)
    .innerJoin(masterProjects, eq(knowledgeEntries.projectId, masterProjects.id))
    .innerJoin(
      knowledgeEvidence,
      eq(knowledgeEvidence.knowledgeEntryId, knowledgeEntries.id),
    )
    .where(where)
    .orderBy(
      desc(masterProjects.year),
      asc(masterProjects.name),
      asc(knowledgeEntries.createdAt),
      asc(knowledgeEntries.id),
    );

  if (rows.length === 0) {
    return [];
  }

  const entryIds = rows.map((row) => row.id);
  const userIds = [
    ...new Set(
      rows.flatMap((row) =>
        [row.createdById, row.updatedById].filter(
          (id): id is string => id !== null,
        ),
      ),
    ),
  ];

  const [picRows, userRows] = await Promise.all([
    db
      .select({
        entryId: knowledgePics.knowledgeEntryId,
        id: users.id,
        name: users.name,
        status: users.status,
      })
      .from(knowledgePics)
      .innerJoin(users, eq(knowledgePics.userId, users.id))
      .where(inArray(knowledgePics.knowledgeEntryId, entryIds))
      .orderBy(asc(users.name), asc(users.id)),
    userIds.length === 0
      ? Promise.resolve([])
      : db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, userIds)),
  ]);

  const picsByEntry = new Map<string, KnowledgePicRow[]>();
  for (const row of picRows) {
    const list = picsByEntry.get(row.entryId) ?? [];
    list.push({ id: row.id, name: row.name, status: row.status });
    picsByEntry.set(row.entryId, list);
  }

  const userById = new Map(userRows.map((user) => [user.id, user]));

  return rows.map((row) => ({
    id: row.id,
    project: {
      id: row.projectId,
      name: row.projectName,
      location: row.projectLocation,
      year: row.projectYear,
    },
    knowledgeType: row.knowledgeType as KnowledgeType,
    content: row.content,
    pics: picsByEntry.get(row.id) ?? [],
    evidence: {
      id: row.evidenceId,
      name: row.evidenceName,
      url: row.evidenceUrl,
    },
    version: row.version,
    createdBy: userById.get(row.createdById) ?? {
      id: row.createdById,
      name: "—",
    },
    createdAt: row.createdAt,
    updatedBy: row.updatedById ? (userById.get(row.updatedById) ?? null) : null,
    updatedAt: row.updatedAt,
  }));
}

export async function listKnowledgeRecords(
  knowledgeType: KnowledgeType,
  db: KnowledgeDb = dbOrDefault(),
): Promise<KnowledgeRecordRow[]> {
  return loadRecordRows(eq(knowledgeEntries.knowledgeType, knowledgeType), db);
}

export async function findKnowledgeRecordById(
  id: string,
  db: KnowledgeDb = dbOrDefault(),
): Promise<KnowledgeRecordRow | null> {
  const rows = await loadRecordRows(eq(knowledgeEntries.id, id), db);
  return rows[0] ?? null;
}

export async function findKnowledgeEntryForUpdate(
  id: string,
  db: KnowledgeDb = dbOrDefault(),
): Promise<{
  id: string;
  version: number;
  projectId: string;
  knowledgeType: KnowledgeType;
} | null> {
  const rows = await db
    .select({
      id: knowledgeEntries.id,
      version: knowledgeEntries.version,
      projectId: knowledgeEntries.projectId,
      knowledgeType: knowledgeEntries.knowledgeType,
    })
    .from(knowledgeEntries)
    .where(eq(knowledgeEntries.id, id))
    .for("update")
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    knowledgeType: row.knowledgeType as KnowledgeType,
  };
}

export async function findMasterProjectById(
  id: string,
  db: KnowledgeDb = dbOrDefault(),
): Promise<{ id: string } | null> {
  const rows = await db
    .select({ id: masterProjects.id })
    .from(masterProjects)
    .where(eq(masterProjects.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertKnowledgeEntry(
  data: {
    projectId: string;
    knowledgeType: KnowledgeType;
    content: string;
    createdBy: string;
  },
  db: KnowledgeDb = dbOrDefault(),
): Promise<string> {
  const rows = await db
    .insert(knowledgeEntries)
    .values({
      ...data,
      version: 1,
      // A brand-new record has never been edited: updated_by stays NULL so the
      // History panel shows "—" for "Diubah" (design G.3/H.7/OD-03). The DB
      // defaults both timestamps in the same statement, so updated_at equals
      // created_at until the first real update.
      updatedBy: null,
    })
    .returning({ id: knowledgeEntries.id });
  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create knowledge entry");
  }
  return created.id;
}

export async function updateKnowledgeEntry(
  id: string,
  content: string,
  updatedBy: string,
  expectedVersion: number,
  db: KnowledgeDb = dbOrDefault(),
): Promise<{ id: string; version: number } | null> {
  const rows = await db
    .update(knowledgeEntries)
    .set({
      content,
      updatedBy,
      updatedAt: sql`clock_timestamp()`,
      version: sql`${knowledgeEntries.version} + 1`,
    })
    .where(
      and(
        eq(knowledgeEntries.id, id),
        eq(knowledgeEntries.version, expectedVersion),
      ),
    )
    .returning({
      id: knowledgeEntries.id,
      version: knowledgeEntries.version,
    });
  return rows[0] ?? null;
}

export async function deleteKnowledgeEntry(
  id: string,
  expectedVersion: number,
  db: KnowledgeDb = dbOrDefault(),
): Promise<boolean> {
  const rows = await db
    .delete(knowledgeEntries)
    .where(
      and(
        eq(knowledgeEntries.id, id),
        eq(knowledgeEntries.version, expectedVersion),
      ),
    )
    .returning({ id: knowledgeEntries.id });
  return rows.length > 0;
}

export async function findEvidenceByEntryId(
  entryId: string,
  db: KnowledgeDb = dbOrDefault(),
): Promise<KnowledgeEvidenceRow | null> {
  const rows = await db
    .select({
      id: knowledgeEvidence.id,
      name: knowledgeEvidence.name,
      url: knowledgeEvidence.url,
    })
    .from(knowledgeEvidence)
    .where(eq(knowledgeEvidence.knowledgeEntryId, entryId))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertKnowledgeEvidence(
  knowledgeEntryId: string,
  data: EvidenceItemInput,
  db: KnowledgeDb = dbOrDefault(),
): Promise<KnowledgeEvidenceRow> {
  const rows = await db
    .insert(knowledgeEvidence)
    .values({ knowledgeEntryId, name: data.name, url: data.url })
    .returning({
      id: knowledgeEvidence.id,
      name: knowledgeEvidence.name,
      url: knowledgeEvidence.url,
    });
  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create knowledge evidence");
  }
  return created;
}

export async function updateKnowledgeEvidence(
  id: string,
  data: EvidenceItemInput,
  db: KnowledgeDb = dbOrDefault(),
): Promise<KnowledgeEvidenceRow | null> {
  const rows = await db
    .update(knowledgeEvidence)
    .set({ name: data.name, url: data.url })
    .where(eq(knowledgeEvidence.id, id))
    .returning({
      id: knowledgeEvidence.id,
      name: knowledgeEvidence.name,
      url: knowledgeEvidence.url,
    });
  return rows[0] ?? null;
}

export async function replaceKnowledgePics(
  knowledgeEntryId: string,
  userIds: string[],
  db: KnowledgeDb = dbOrDefault(),
): Promise<void> {
  await db.delete(knowledgePics).where(eq(knowledgePics.knowledgeEntryId, knowledgeEntryId));
  if (userIds.length === 0) {
    return;
  }
  await db
    .insert(knowledgePics)
    .values(userIds.map((userId) => ({ knowledgeEntryId, userId })));
}

// PIC option feed. Every Head Office user is eligible REGARDLESS of account
// status, so no status filter is applied.
export async function listHeadOfficePicOptions(
  db: KnowledgeDb = dbOrDefault(),
): Promise<Array<{ id: string; name: string; status: string; position: string }>> {
  return db
    .select({
      id: users.id,
      name: users.name,
      status: users.status,
      position: users.position,
    })
    .from(users)
    .where(eq(users.role, HEAD_OFFICE_ROLE))
    .orderBy(asc(users.name), asc(users.id));
}

export async function listMasterProjectOptions(
  query: string | undefined,
  db: KnowledgeDb = dbOrDefault(),
): Promise<KnowledgeProjectSummary[]> {
  const search = query?.trim();
  const base = db
    .select({
      id: masterProjects.id,
      name: masterProjects.name,
      location: masterProjects.location,
      year: masterProjects.year,
    })
    .from(masterProjects);

  if (search) {
    const pattern = `%${search}%`;
    return base
      .where(
        or(
          ilike(masterProjects.name, pattern),
          ilike(masterProjects.location, pattern),
        ),
      )
      .orderBy(desc(masterProjects.year), asc(masterProjects.name), asc(masterProjects.id))
      .limit(50);
  }

  return base
    .orderBy(desc(masterProjects.year), asc(masterProjects.name), asc(masterProjects.id))
    .limit(50);
}

export async function findUsersByIds(
  ids: string[],
  db: KnowledgeDb = dbOrDefault(),
): Promise<PgUser[]> {
  if (ids.length === 0) {
    return [];
  }
  return db.select().from(users).where(inArray(users.id, ids));
}
