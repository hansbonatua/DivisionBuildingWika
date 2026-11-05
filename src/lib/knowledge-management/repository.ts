import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
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

// Server-only persistence for Knowledge Management V1. No business policy here:
// project/PIC existence and Head Office eligibility are service rules; URL
// safety is validated at the API boundary by Zod.

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
};

// One row per Master Project, always — even when no knowledge record exists yet.
// The table is assembled from the project directory (LEFT JOIN), never from the
// knowledge table, so newly created projects appear automatically without any
// placeholder rows being written to the database.
export type KnowledgeProjectRow = {
  projectId: string;
  projectName: string;
  projectLocation: string;
  projectYear: number;
  entryId: string | null;
  content: string | null;
  // Exact PostgreSQL timestamp token (UTC, microsecond precision). It is a
  // string on purpose: converting through Date would drop microseconds and
  // weaken optimistic concurrency inside the same millisecond.
  updatedAt: string | null;
  evidence: KnowledgeEvidenceRow[];
  pics: KnowledgePicRow[];
};

export async function listKnowledgeRows(
  knowledgeType: KnowledgeType,
  db: KnowledgeDb = dbOrDefault(),
): Promise<KnowledgeProjectRow[]> {
  const projects = await db
    .select({
      projectId: masterProjects.id,
      projectName: masterProjects.name,
      projectLocation: masterProjects.location,
      projectYear: masterProjects.year,
      entryId: knowledgeEntries.id,
      content: knowledgeEntries.content,
      updatedAt: sql<string | null>`to_char(${knowledgeEntries.updatedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
    })
    .from(masterProjects)
    .leftJoin(
      knowledgeEntries,
      and(
        eq(knowledgeEntries.projectId, masterProjects.id),
        eq(knowledgeEntries.knowledgeType, knowledgeType),
      ),
    )
    .orderBy(desc(masterProjects.year), asc(masterProjects.name), asc(masterProjects.id));

  if (projects.length === 0) {
    return [];
  }

  const entryIds = projects
    .map((row) => row.entryId)
    .filter((id): id is string => id !== null);

  const evidenceByEntry = new Map<string, KnowledgeEvidenceRow[]>();
  const picsByEntry = new Map<string, KnowledgePicRow[]>();

  if (entryIds.length > 0) {
    const [evidenceRows, picRows] = await Promise.all([
      db
        .select({
          id: knowledgeEvidence.id,
          entryId: knowledgeEvidence.knowledgeEntryId,
          name: knowledgeEvidence.name,
          url: knowledgeEvidence.url,
        })
        .from(knowledgeEvidence)
        .where(inArray(knowledgeEvidence.knowledgeEntryId, entryIds))
        .orderBy(asc(knowledgeEvidence.sortOrder), asc(knowledgeEvidence.name)),
      db
        .select({
          entryId: knowledgePics.knowledgeEntryId,
          id: users.id,
          name: users.name,
        })
        .from(knowledgePics)
        .innerJoin(users, eq(knowledgePics.userId, users.id))
        .where(inArray(knowledgePics.knowledgeEntryId, entryIds))
        .orderBy(asc(users.name), asc(users.id)),
    ]);

    for (const row of evidenceRows) {
      const list = evidenceByEntry.get(row.entryId) ?? [];
      list.push({ id: row.id, name: row.name, url: row.url });
      evidenceByEntry.set(row.entryId, list);
    }
    for (const row of picRows) {
      const list = picsByEntry.get(row.entryId) ?? [];
      list.push({ id: row.id, name: row.name });
      picsByEntry.set(row.entryId, list);
    }
  }

  return projects.map((row) => ({
    projectId: row.projectId,
    projectName: row.projectName,
    projectLocation: row.projectLocation,
    projectYear: row.projectYear,
    entryId: row.entryId,
    content: row.content,
    updatedAt: row.updatedAt,
    evidence: row.entryId ? (evidenceByEntry.get(row.entryId) ?? []) : [],
    pics: row.entryId ? (picsByEntry.get(row.entryId) ?? []) : [],
  }));
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

export async function findKnowledgeEntry(
  projectId: string,
  knowledgeType: KnowledgeType,
  db: KnowledgeDb = dbOrDefault(),
): Promise<{ id: string; updatedAt: string } | null> {
  const rows = await db
    .select({
      id: knowledgeEntries.id,
      updatedAt: sql<string>`to_char(${knowledgeEntries.updatedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
    })
    .from(knowledgeEntries)
    .where(
      and(
        eq(knowledgeEntries.projectId, projectId),
        eq(knowledgeEntries.knowledgeType, knowledgeType),
      ),
    )
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
    .values({ ...data, updatedBy: data.createdBy })
    .returning({ id: knowledgeEntries.id });
  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create knowledge entry");
  }
  return created.id;
}

// Guarded update: the row is only written when its stored updated_at still
// equals the value the caller read. A concurrent commit changes updated_at, so
// the UPDATE matches zero rows and the service reports 409 instead of
// overwriting newer data (KM-03).
//
// The token is the exact UTC timestamp string (microseconds) the client
// received. It is cast back to timestamptz for an exact comparison inside the
// UPDATE, so no JavaScript Date conversion can truncate precision.
//
// The new timestamp must be STRICTLY greater than the old one: `now()` is the
// transaction start time and can repeat (or, with clock adjustments, go
// backwards), which would let a replayed token match again. GREATEST with old
// value + 1 microsecond guarantees forward progress even when the clock does
// not, while keeping full PostgreSQL precision.
export async function updateKnowledgeContentIfUnchanged(
  id: string,
  content: string,
  updatedBy: string,
  expectedUpdatedAt: string,
  db: KnowledgeDb = dbOrDefault(),
): Promise<boolean> {
  const rows = await db
    .update(knowledgeEntries)
    .set({
      content,
      updatedBy,
      updatedAt: sql`greatest(clock_timestamp(), ${knowledgeEntries.updatedAt} + interval '1 microsecond')`,
    })
    .where(
      and(
        eq(knowledgeEntries.id, id),
        sql`${knowledgeEntries.updatedAt} = ${expectedUpdatedAt}::timestamptz`,
      ),
    )
    .returning({ id: knowledgeEntries.id });
  return rows.length > 0;
}

// Evidence is managed one row at a time (inline editing): add, edit or delete a
// single evidence without touching content, PIC or the other evidence rows.
export async function findEvidenceById(
  id: string,
  db: KnowledgeDb = dbOrDefault(),
): Promise<{ id: string; knowledgeEntryId: string } | null> {
  const rows = await db
    .select({
      id: knowledgeEvidence.id,
      knowledgeEntryId: knowledgeEvidence.knowledgeEntryId,
    })
    .from(knowledgeEvidence)
    .where(eq(knowledgeEvidence.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function nextEvidenceSortOrder(
  knowledgeEntryId: string,
  db: KnowledgeDb = dbOrDefault(),
): Promise<number> {
  const rows = await db
    .select({ maxOrder: sql<number | null>`max(${knowledgeEvidence.sortOrder})` })
    .from(knowledgeEvidence)
    .where(eq(knowledgeEvidence.knowledgeEntryId, knowledgeEntryId));
  const current = rows[0]?.maxOrder ?? null;
  return current === null ? 0 : Number(current) + 1;
}

export async function insertKnowledgeEvidence(
  knowledgeEntryId: string,
  data: EvidenceItemInput,
  sortOrder: number,
  db: KnowledgeDb = dbOrDefault(),
): Promise<{ id: string; name: string; url: string }> {
  const rows = await db
    .insert(knowledgeEvidence)
    .values({ knowledgeEntryId, name: data.name, url: data.url, sortOrder })
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
): Promise<{ id: string; name: string; url: string } | null> {
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

export async function deleteKnowledgeEvidence(
  id: string,
  db: KnowledgeDb = dbOrDefault(),
): Promise<boolean> {
  const rows = await db
    .delete(knowledgeEvidence)
    .where(eq(knowledgeEvidence.id, id))
    .returning({ id: knowledgeEvidence.id });
  return rows.length > 0;
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
// status (explicit V1 rule), so no status filter is applied. Identity and status
// are returned so the UI can show who is suspended.
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

export async function findUsersByIds(
  ids: string[],
  db: KnowledgeDb = dbOrDefault(),
): Promise<PgUser[]> {
  if (ids.length === 0) {
    return [];
  }
  return db.select().from(users).where(inArray(users.id, ids));
}
