import { asc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getPgDb, type PgDatabase } from "@/lib/pg/client";
import { calculationSheetTemplates, users } from "@/lib/pg/schema";
import type { CstCategoryId } from "@/lib/calculation-sheet-template/constants";
import { HEAD_OFFICE_ROLE } from "@/lib/users/roles";

// Server-only persistence for Calculation Sheet Template (CST).
// Business policy (permissions, PIC eligibility, duplicate mapping) belongs to
// the service; this module only builds queries and performs single-row writes.

export type CalculationSheetDb = PgDatabase;

function dbOrDefault(db?: CalculationSheetDb): CalculationSheetDb {
  return db ?? getPgDb();
}

export type CalculationSheetTemplateRow = {
  id: string;
  kategori: string;
  kode: string;
  nama: string;
  picUserId: string;
  picName: string;
  picStatus: string;
  picPosition: string;
  evidenceUrl: string | null;
  catatan: string | null;
  createdById: string;
  createdByName: string;
  updatedById: string | null;
  updatedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CalculationSheetTemplateInsert = {
  kategori: string;
  kode: string;
  nama: string;
  picUserId: string;
  evidenceUrl: string | null;
  catatan: string | null;
  createdBy: string;
};

export type CalculationSheetTemplateUpdate = {
  kode: string;
  nama: string;
  picUserId: string;
  evidenceUrl: string | null;
  catatan: string | null;
  updatedBy: string;
};

export type CalculationSheetUserRow = {
  id: string;
  name: string;
  role: string;
  status: string;
};

export type CalculationSheetPicOptionRow = {
  id: string;
  name: string;
  status: string;
  position: string;
};

const picUser = alias(users, "pic_user");
const createdUser = alias(users, "created_user");
const updatedUser = alias(users, "updated_user");

const templateColumns = {
  id: calculationSheetTemplates.id,
  kategori: calculationSheetTemplates.kategori,
  kode: calculationSheetTemplates.kode,
  nama: calculationSheetTemplates.nama,
  picUserId: calculationSheetTemplates.picUserId,
  picName: picUser.name,
  picStatus: picUser.status,
  picPosition: picUser.position,
  evidenceUrl: calculationSheetTemplates.evidenceUrl,
  catatan: calculationSheetTemplates.catatan,
  createdById: calculationSheetTemplates.createdBy,
  createdByName: createdUser.name,
  updatedById: calculationSheetTemplates.updatedBy,
  updatedByName: updatedUser.name,
  createdAt: calculationSheetTemplates.createdAt,
  updatedAt: calculationSheetTemplates.updatedAt,
};

function baseSelect(db: CalculationSheetDb) {
  return db
    .select(templateColumns)
    .from(calculationSheetTemplates)
    .innerJoin(picUser, eq(calculationSheetTemplates.picUserId, picUser.id))
    .innerJoin(createdUser, eq(calculationSheetTemplates.createdBy, createdUser.id))
    .leftJoin(updatedUser, eq(calculationSheetTemplates.updatedBy, updatedUser.id));
}

// Deterministic order: category, then case-insensitive kode, then id.
// Canonical category order and grouping are applied by the presentation layer
// (the API stays a flat list).
export async function listTemplateRows(
  db: CalculationSheetDb = dbOrDefault(),
  kategori?: CstCategoryId,
): Promise<CalculationSheetTemplateRow[]> {
  const query = baseSelect(db);
  const filtered = kategori
    ? query.where(eq(calculationSheetTemplates.kategori, kategori))
    : query;
  return filtered.orderBy(
    asc(calculationSheetTemplates.kategori),
    asc(sql`lower(btrim(${calculationSheetTemplates.kode}))`),
    asc(calculationSheetTemplates.id),
  );
}

export async function findTemplateById(
  id: string,
  db: CalculationSheetDb = dbOrDefault(),
): Promise<CalculationSheetTemplateRow | null> {
  const rows = await baseSelect(db)
    .where(eq(calculationSheetTemplates.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertTemplate(
  data: CalculationSheetTemplateInsert,
  db: CalculationSheetDb = dbOrDefault(),
): Promise<CalculationSheetTemplateRow> {
  const rows = await db
    .insert(calculationSheetTemplates)
    .values({ ...data, updatedBy: null })
    .returning({ id: calculationSheetTemplates.id });
  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create Calculation Sheet Template");
  }
  const row = await findTemplateById(created.id, db);
  if (!row) {
    throw new Error("Failed to read created Calculation Sheet Template");
  }
  return row;
}

export async function updateTemplate(
  id: string,
  data: CalculationSheetTemplateUpdate,
  db: CalculationSheetDb = dbOrDefault(),
): Promise<CalculationSheetTemplateRow | null> {
  const rows = await db
    .update(calculationSheetTemplates)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(calculationSheetTemplates.id, id))
    .returning({ id: calculationSheetTemplates.id });
  if (rows.length === 0) {
    return null;
  }
  return findTemplateById(id, db);
}

export async function deleteTemplate(
  id: string,
  db: CalculationSheetDb = dbOrDefault(),
): Promise<boolean> {
  const rows = await db
    .delete(calculationSheetTemplates)
    .where(eq(calculationSheetTemplates.id, id))
    .returning({ id: calculationSheetTemplates.id });
  return rows.length > 0;
}

export async function findUserById(
  id: string,
  db: CalculationSheetDb = dbOrDefault(),
): Promise<CalculationSheetUserRow | null> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// PIC options: Head Office only, including suspended users (the UI labels them
// "non-aktif" and they remain assignable, matching MKS).
export async function listPicOptionRows(
  db: CalculationSheetDb = dbOrDefault(),
): Promise<CalculationSheetPicOptionRow[]> {
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
