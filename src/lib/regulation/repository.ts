import { asc, eq, inArray, max, sql } from "drizzle-orm";
import { getPgDb, type PgDatabase } from "@/lib/pg/client";
import {
  regulationDocument,
  regulationSubKategori,
  users,
} from "@/lib/pg/schema";

// Server-only persistence for Standard & Regulation. Business rules
// (permissions, 409 child guard, upload verification) belong to service.ts.

type PgTransaction = Parameters<Parameters<PgDatabase["transaction"]>[0]>[0];
export type RegulationDb = PgDatabase | PgTransaction;

function dbOrDefault(db?: RegulationDb): RegulationDb {
  return db ?? getPgDb();
}

export type RegulationSubKategoriRow = {
  id: string;
  disiplin: string;
  kode: string;
  nama: string;
  sortOrder: number;
  note: string | null;
  createdById: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RegulationDocumentRow = {
  id: string;
  subKategoriId: string;
  kode: string;
  nama: string;
  sortOrder: number;
  filePathname: string;
  fileName: string;
  fileMimeType: string;
  fileSizeBytes: number;
  note: string | null;
  createdById: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RegulationUserRow = {
  id: string;
  name: string;
};

export type RegulationSubKategoriInsert = {
  disiplin: string;
  kode: string;
  nama: string;
  sortOrder: number;
  note: string | null;
  createdBy: string;
};

export type RegulationSubKategoriUpdate = {
  kode?: string;
  nama?: string;
  note?: string | null;
  updatedBy: string;
};

export type RegulationDocumentInsert = {
  subKategoriId: string;
  kode: string;
  nama: string;
  sortOrder: number;
  filePathname: string;
  fileName: string;
  fileMimeType: string;
  fileSizeBytes: number;
  note: string | null;
  createdBy: string;
};

export type RegulationDocumentUpdate = {
  kode?: string;
  nama?: string;
  note?: string | null;
  filePathname?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
  updatedBy: string;
};

const subKategoriColumns = {
  id: regulationSubKategori.id,
  disiplin: regulationSubKategori.disiplin,
  kode: regulationSubKategori.kode,
  nama: regulationSubKategori.nama,
  sortOrder: regulationSubKategori.sortOrder,
  note: regulationSubKategori.note,
  createdById: regulationSubKategori.createdBy,
  updatedById: regulationSubKategori.updatedBy,
  createdAt: regulationSubKategori.createdAt,
  updatedAt: regulationSubKategori.updatedAt,
};

const documentColumns = {
  id: regulationDocument.id,
  subKategoriId: regulationDocument.subKategoriId,
  kode: regulationDocument.kode,
  nama: regulationDocument.nama,
  sortOrder: regulationDocument.sortOrder,
  filePathname: regulationDocument.filePathname,
  fileName: regulationDocument.fileName,
  fileMimeType: regulationDocument.fileMimeType,
  fileSizeBytes: regulationDocument.fileSizeBytes,
  note: regulationDocument.note,
  createdById: regulationDocument.createdBy,
  updatedById: regulationDocument.updatedBy,
  createdAt: regulationDocument.createdAt,
  updatedAt: regulationDocument.updatedAt,
};

export async function listSubKategoriRows(
  disiplin: string,
  db: RegulationDb = dbOrDefault(),
): Promise<RegulationSubKategoriRow[]> {
  return db
    .select(subKategoriColumns)
    .from(regulationSubKategori)
    .where(eq(regulationSubKategori.disiplin, disiplin))
    .orderBy(
      asc(regulationSubKategori.sortOrder),
      asc(regulationSubKategori.createdAt),
      asc(regulationSubKategori.id),
    );
}

export async function listDocumentsForSubKategoriIds(
  subKategoriIds: readonly string[],
  db: RegulationDb = dbOrDefault(),
): Promise<RegulationDocumentRow[]> {
  if (subKategoriIds.length === 0) {
    return [];
  }
  return db
    .select(documentColumns)
    .from(regulationDocument)
    .where(inArray(regulationDocument.subKategoriId, [...subKategoriIds]))
    .orderBy(
      asc(regulationDocument.sortOrder),
      asc(regulationDocument.createdAt),
      asc(regulationDocument.id),
    );
}

export async function findSubKategoriById(
  id: string,
  db: RegulationDb = dbOrDefault(),
): Promise<RegulationSubKategoriRow | null> {
  const rows = await db
    .select(subKategoriColumns)
    .from(regulationSubKategori)
    .where(eq(regulationSubKategori.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function findDocumentById(
  id: string,
  db: RegulationDb = dbOrDefault(),
): Promise<RegulationDocumentRow | null> {
  const rows = await db
    .select(documentColumns)
    .from(regulationDocument)
    .where(eq(regulationDocument.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function findDocumentByFilePathname(
  pathname: string,
  db: RegulationDb = dbOrDefault(),
): Promise<{ id: string } | null> {
  const rows = await db
    .select({ id: regulationDocument.id })
    .from(regulationDocument)
    .where(eq(regulationDocument.filePathname, pathname))
    .limit(1);
  return rows[0] ?? null;
}

export async function countDocumentsInSubKategori(
  subKategoriId: string,
  db: RegulationDb = dbOrDefault(),
): Promise<number> {
  const rows = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(regulationDocument)
    .where(eq(regulationDocument.subKategoriId, subKategoriId));
  return Number(rows[0]?.value ?? 0);
}

export async function nextSubKategoriSortOrder(
  disiplin: string,
  db: RegulationDb = dbOrDefault(),
): Promise<number> {
  const rows = await db
    .select({ value: max(regulationSubKategori.sortOrder) })
    .from(regulationSubKategori)
    .where(eq(regulationSubKategori.disiplin, disiplin));
  return Number(rows[0]?.value ?? 0) + 10;
}

export async function nextDocumentSortOrder(
  subKategoriId: string,
  db: RegulationDb = dbOrDefault(),
): Promise<number> {
  const rows = await db
    .select({ value: max(regulationDocument.sortOrder) })
    .from(regulationDocument)
    .where(eq(regulationDocument.subKategoriId, subKategoriId));
  return Number(rows[0]?.value ?? 0) + 10;
}

export async function insertSubKategori(
  data: RegulationSubKategoriInsert,
  db: RegulationDb = dbOrDefault(),
): Promise<string> {
  const rows = await db
    .insert(regulationSubKategori)
    .values({ ...data, updatedBy: null })
    .returning({ id: regulationSubKategori.id });
  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create Regulation sub-kategori");
  }
  return created.id;
}

export async function updateSubKategori(
  id: string,
  data: RegulationSubKategoriUpdate,
  db: RegulationDb = dbOrDefault(),
): Promise<boolean> {
  const rows = await db
    .update(regulationSubKategori)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(regulationSubKategori.id, id))
    .returning({ id: regulationSubKategori.id });
  return rows.length > 0;
}

export async function deleteSubKategori(
  id: string,
  db: RegulationDb = dbOrDefault(),
): Promise<boolean> {
  const rows = await db
    .delete(regulationSubKategori)
    .where(eq(regulationSubKategori.id, id))
    .returning({ id: regulationSubKategori.id });
  return rows.length > 0;
}

export async function insertDocument(
  data: RegulationDocumentInsert,
  db: RegulationDb = dbOrDefault(),
): Promise<string> {
  const rows = await db
    .insert(regulationDocument)
    .values({ ...data, updatedBy: null })
    .returning({ id: regulationDocument.id });
  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create Regulation document");
  }
  return created.id;
}

export async function updateDocument(
  id: string,
  data: RegulationDocumentUpdate,
  db: RegulationDb = dbOrDefault(),
): Promise<boolean> {
  const rows = await db
    .update(regulationDocument)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(regulationDocument.id, id))
    .returning({ id: regulationDocument.id });
  return rows.length > 0;
}

export async function deleteDocument(
  id: string,
  db: RegulationDb = dbOrDefault(),
): Promise<boolean> {
  const rows = await db
    .delete(regulationDocument)
    .where(eq(regulationDocument.id, id))
    .returning({ id: regulationDocument.id });
  return rows.length > 0;
}

export async function listUsersByIds(
  ids: readonly string[],
  db: RegulationDb = dbOrDefault(),
): Promise<RegulationUserRow[]> {
  if (ids.length === 0) {
    return [];
  }
  return db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, [...ids]));
}

export async function listReorderSubKategoriIds(
  disiplin: string,
  db: RegulationDb = dbOrDefault(),
): Promise<string[]> {
  const rows = await db
    .select({ id: regulationSubKategori.id })
    .from(regulationSubKategori)
    .where(eq(regulationSubKategori.disiplin, disiplin));
  return rows.map((row) => row.id);
}

export async function listReorderDocumentIds(
  subKategoriId: string,
  db: RegulationDb = dbOrDefault(),
): Promise<string[]> {
  const rows = await db
    .select({ id: regulationDocument.id })
    .from(regulationDocument)
    .where(eq(regulationDocument.subKategoriId, subKategoriId));
  return rows.map((row) => row.id);
}

export async function updateSortOrders(
  entity: "sub_kategori" | "document",
  orderedIds: readonly string[],
  updatedBy: string,
  db: RegulationDb = dbOrDefault(),
): Promise<void> {
  const updatedAt = new Date();
  for (let index = 0; index < orderedIds.length; index += 1) {
    const id = orderedIds[index];
    if (!id) continue;
    const sortOrder = (index + 1) * 10;
    if (entity === "sub_kategori") {
      await db
        .update(regulationSubKategori)
        .set({ sortOrder, updatedBy, updatedAt })
        .where(eq(regulationSubKategori.id, id));
    } else {
      await db
        .update(regulationDocument)
        .set({ sortOrder, updatedBy, updatedAt })
        .where(eq(regulationDocument.id, id));
    }
  }
}
