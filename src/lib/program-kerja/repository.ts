import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { HEAD_OFFICE_ROLE } from "@/lib/users/roles";
import { getPgDb, type PgDatabase } from "@/lib/pg/client";
import {
  programKerja,
  programKerjaGroups,
  programKerjaMonthly,
  programKerjaPics,
  users,
  type NewPgProgramKerja,
  type NewPgProgramKerjaMonthly,
  type PgProgramKerja,
  type PgProgramKerjaGroup,
  type PgProgramKerjaMonthly,
  type PgUser,
} from "@/lib/pg/schema";

// Server-only persistence for Kelola Program Kerja. No business policy here
// (access, locks, RA rules live in the service layer). PG numeric columns
// arrive as strings from the driver, so monthly rows are normalized to
// numbers at this boundary — application code never compares numeric
// strings lexically.

type PgTransaction = Parameters<Parameters<PgDatabase["transaction"]>[0]>[0];

export type ProgramKerjaDb = PgDatabase | PgTransaction;

function dbOrDefault(db?: ProgramKerjaDb): ProgramKerjaDb {
  return db ?? getPgDb();
}

export type ProgramKerjaMonthlyDto = Omit<PgProgramKerjaMonthly, "raValue" | "riValue"> & {
  raValue: number;
  riValue: number | null;
};

function mapMonthlyRow(row: PgProgramKerjaMonthly): ProgramKerjaMonthlyDto {
  return {
    ...row,
    raValue: Number(row.raValue),
    riValue: row.riValue === null ? null : Number(row.riValue),
  };
}

export async function findGroupById(
  id: string,
  db: ProgramKerjaDb = dbOrDefault(),
): Promise<PgProgramKerjaGroup | null> {
  const rows = await db.select().from(programKerjaGroups).where(eq(programKerjaGroups.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listGroups(db: ProgramKerjaDb = dbOrDefault()): Promise<PgProgramKerjaGroup[]> {
  return db.select().from(programKerjaGroups).orderBy(asc(programKerjaGroups.sortOrder), asc(programKerjaGroups.name));
}

export async function listPrograms(db: ProgramKerjaDb = dbOrDefault()): Promise<PgProgramKerja[]> {
  return db
    .select()
    .from(programKerja)
    .orderBy(desc(programKerja.year), asc(programKerja.name));
}

// Enriched list fetch for the Kelola table: constant query count
// regardless of program count (no N+1). Groups are a small reference
// table fetched wholesale; monthly and PIC rows are batched by program id.
export type ProgramKerjaListRow = {
  program: PgProgramKerja;
  group: { id: string; name: string } | null;
  monthly: ProgramKerjaMonthlyDto[];
  pics: Array<{ id: string; name: string }>;
};

export async function listProgramRows(
  db: ProgramKerjaDb = dbOrDefault(),
): Promise<ProgramKerjaListRow[]> {
  const programs = await listPrograms(db);
  if (programs.length === 0) {
    return [];
  }
  const ids = programs.map((program) => program.id);
  const [monthlyRows, picRows, groups] = await Promise.all([
    db
      .select()
      .from(programKerjaMonthly)
      .where(inArray(programKerjaMonthly.programKerjaId, ids))
      .orderBy(asc(programKerjaMonthly.month)),
    db
      .select({
        programKerjaId: programKerjaPics.programKerjaId,
        id: users.id,
        name: users.name,
      })
      .from(programKerjaPics)
      .innerJoin(users, eq(programKerjaPics.userId, users.id))
      .where(inArray(programKerjaPics.programKerjaId, ids)),
    db.select().from(programKerjaGroups),
  ]);
  const monthlyByProgram = new Map<string, ProgramKerjaMonthlyDto[]>();
  for (const row of monthlyRows) {
    const list = monthlyByProgram.get(row.programKerjaId) ?? [];
    list.push(mapMonthlyRow(row));
    monthlyByProgram.set(row.programKerjaId, list);
  }
  const picsByProgram = new Map<string, Array<{ id: string; name: string }>>();
  for (const row of picRows) {
    const list = picsByProgram.get(row.programKerjaId) ?? [];
    list.push({ id: row.id, name: row.name });
    picsByProgram.set(row.programKerjaId, list);
  }
  const groupsById = new Map(groups.map((group) => [group.id, { id: group.id, name: group.name }]));
  return programs.map((program) => ({
    program,
    // group_id is a required FK so this is defensive-only; callers fall
    // back to a generic label when null.
    group: groupsById.get(program.groupId) ?? null,
    monthly: monthlyByProgram.get(program.id) ?? [],
    pics: picsByProgram.get(program.id) ?? [],
  }));
}

// Summary filter options: only Head Office users who actually hold at least
// one PIC assignment. Users without assignments are intentionally excluded.
export async function listAssignedPicUsers(
  db: ProgramKerjaDb = dbOrDefault(),
): Promise<Array<{ id: string; name: string }>> {
  return db
    .selectDistinct({ id: users.id, name: users.name })
    .from(programKerjaPics)
    .innerJoin(users, eq(programKerjaPics.userId, users.id))
    .where(eq(users.role, HEAD_OFFICE_ROLE))
    .orderBy(asc(users.name), asc(users.id));
}

// PIC option feed for the create/edit forms: every Head Office user, role-based
// only (V1 deliberately does not filter by account status). Narrow projection —
// this is the dedicated replacement for reading the broad user directory.
export async function listHeadOfficePicOptions(
  db: ProgramKerjaDb = dbOrDefault(),
): Promise<Array<{ id: string; name: string }>> {
  return db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.role, HEAD_OFFICE_ROLE))
    .orderBy(asc(users.name), asc(users.id));
}

export async function findProgramById(
  id: string,
  db: ProgramKerjaDb = dbOrDefault(),
): Promise<PgProgramKerja | null> {
  const rows = await db.select().from(programKerja).where(eq(programKerja.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function insertProgram(
  data: NewPgProgramKerja,
  db: ProgramKerjaDb = dbOrDefault(),
): Promise<PgProgramKerja> {
  const rows = await db.insert(programKerja).values(data).returning();
  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create program kerja");
  }
  return created;
}

export async function updateProgram(
  id: string,
  data: Partial<NewPgProgramKerja>,
  db: ProgramKerjaDb = dbOrDefault(),
): Promise<PgProgramKerja | null> {
  const rows = await db.update(programKerja).set(data).where(eq(programKerja.id, id)).returning();
  return rows[0] ?? null;
}

export async function deleteProgram(
  id: string,
  db: ProgramKerjaDb = dbOrDefault(),
): Promise<boolean> {
  const rows = await db.delete(programKerja).where(eq(programKerja.id, id)).returning({ id: programKerja.id });
  return rows.length > 0;
}

export async function insertMonthlyRows(
  rows: NewPgProgramKerjaMonthly[],
  db: ProgramKerjaDb = dbOrDefault(),
): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await db.insert(programKerjaMonthly).values(rows);
}

export async function updateMonthlyRa(
  programKerjaId: string,
  month: number,
  raValue: number | string,
  db: ProgramKerjaDb = dbOrDefault(),
): Promise<void> {
  await db
    .update(programKerjaMonthly)
    .set({ raValue: String(raValue) })
    .where(
      and(eq(programKerjaMonthly.programKerjaId, programKerjaId), eq(programKerjaMonthly.month, month)),
    );
}

export async function findMonthlyRows(
  programKerjaId: string,
  db: ProgramKerjaDb = dbOrDefault(),
): Promise<ProgramKerjaMonthlyDto[]> {
  const rows = await db
    .select()
    .from(programKerjaMonthly)
    .where(eq(programKerjaMonthly.programKerjaId, programKerjaId))
    .orderBy(asc(programKerjaMonthly.month));
  return rows.map(mapMonthlyRow);
}

export async function hasAnyRi(
  programKerjaId: string,
  db: ProgramKerjaDb = dbOrDefault(),
): Promise<boolean> {
  // NULL and 0 both count as "reported" — never use ri_value > 0 here.
  const rows = await db
    .select({ id: programKerjaMonthly.id })
    .from(programKerjaMonthly)
    .where(
      and(
        eq(programKerjaMonthly.programKerjaId, programKerjaId),
        isNotNull(programKerjaMonthly.riValue),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function findRiMonthRange(
  programKerjaId: string,
  db: ProgramKerjaDb = dbOrDefault(),
): Promise<{ minMonth: number; maxMonth: number } | null> {
  const rows = await db
    .select({
      minMonth: sql<number>`min(${programKerjaMonthly.month})`,
      maxMonth: sql<number>`max(${programKerjaMonthly.month})`,
    })
    .from(programKerjaMonthly)
    .where(
      and(
        eq(programKerjaMonthly.programKerjaId, programKerjaId),
        isNotNull(programKerjaMonthly.riValue),
      ),
    );
  const range = rows[0];
  if (!range || range.minMonth === null || range.maxMonth === null) {
    return null;
  }
  return { minMonth: Number(range.minMonth), maxMonth: Number(range.maxMonth) };
}

export async function findPicUserIds(
  programKerjaId: string,
  db: ProgramKerjaDb = dbOrDefault(),
): Promise<string[]> {
  const rows = await db
    .select({ userId: programKerjaPics.userId })
    .from(programKerjaPics)
    .where(eq(programKerjaPics.programKerjaId, programKerjaId));
  return rows.map((row) => row.userId);
}

export async function replacePics(
  programKerjaId: string,
  userIds: string[],
  db: ProgramKerjaDb = dbOrDefault(),
): Promise<void> {
  await db.delete(programKerjaPics).where(eq(programKerjaPics.programKerjaId, programKerjaId));
  if (userIds.length === 0) {
    return;
  }
  await db
    .insert(programKerjaPics)
    .values(userIds.map((userId) => ({ programKerjaId, userId })));
}

export async function isUserAssignedPic(
  programKerjaId: string,
  userId: string,
  db: ProgramKerjaDb = dbOrDefault(),
): Promise<boolean> {
  const rows = await db
    .select({ userId: programKerjaPics.userId })
    .from(programKerjaPics)
    .where(
      and(
        eq(programKerjaPics.programKerjaId, programKerjaId),
        eq(programKerjaPics.userId, userId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function updateMonthlyRi(
  programKerjaId: string,
  month: number,
  ri: number,
  updatedBy: string,
  db: ProgramKerjaDb = dbOrDefault(),
): Promise<ProgramKerjaMonthlyDto | null> {
  const rows = await db
    .update(programKerjaMonthly)
    .set({ riValue: String(ri), riUpdatedBy: updatedBy, riUpdatedAt: new Date() })
    .where(
      and(eq(programKerjaMonthly.programKerjaId, programKerjaId), eq(programKerjaMonthly.month, month)),
    )
    .returning();
  const updated = rows[0];
  return updated ? mapMonthlyRow(updated) : null;
}

export async function updateProgramNote(
  programKerjaId: string,
  note: string,
  db: ProgramKerjaDb = dbOrDefault(),
): Promise<PgProgramKerja | null> {
  const rows = await db
    .update(programKerja)
    .set({ note })
    .where(eq(programKerja.id, programKerjaId))
    .returning();
  return rows[0] ?? null;
}

export async function updateProgramEvidence(
  programKerjaId: string,
  evidenceUrl: string,
  db: ProgramKerjaDb = dbOrDefault(),
): Promise<PgProgramKerja | null> {
  const rows = await db
    .update(programKerja)
    .set({ evidenceUrl })
    .where(eq(programKerja.id, programKerjaId))
    .returning();
  return rows[0] ?? null;
}

export async function findUsersByIds(
  ids: string[],
  db: ProgramKerjaDb = dbOrDefault(),
): Promise<PgUser[]> {
  if (ids.length === 0) {
    return [];
  }
  return db.select().from(users).where(inArray(users.id, ids));
}
