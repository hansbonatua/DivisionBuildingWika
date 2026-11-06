import { asc, eq, inArray, max, sql } from "drizzle-orm";
import { getPgDb, type PgDatabase } from "@/lib/pg/client";
import {
  metodeKerjaItem,
  metodeKerjaPic,
  metodeKerjaSubKategori,
  users,
} from "@/lib/pg/schema";
import { HEAD_OFFICE_ROLE } from "@/lib/users/roles";

// Server-only persistence for Metode Kerja Standar. Business policy
// (permission, PIC role, status, child-delete rule) belongs to the service;
// this module only builds queries and performs transaction-local writes.

type PgTransaction = Parameters<Parameters<PgDatabase["transaction"]>[0]>[0];
export type MetodeKerjaDb = PgDatabase | PgTransaction;

function dbOrDefault(db?: MetodeKerjaDb): MetodeKerjaDb {
  return db ?? getPgDb();
}

export type MetodeKerjaSubKategoriRow = {
  id: string;
  disiplin: string;
  kode: string;
  nama: string;
  sortOrder: number;
  evidenceUrl: string | null;
  note: string | null;
  createdById: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MetodeKerjaItemRow = {
  id: string;
  subKategoriId: string;
  kode: string;
  nama: string;
  sortOrder: number;
  evidenceUrl: string | null;
  note: string | null;
  createdById: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MetodeKerjaPicRow = {
  picId: string;
  subKategoriId: string | null;
  itemId: string | null;
  userId: string;
  name: string;
  status: string;
  position: string;
};

export type MetodeKerjaUserRow = {
  id: string;
  name: string;
  role: string;
  status: string;
};

export type MetodeKerjaPicOptionRow = {
  id: string;
  name: string;
  status: string;
  position: string;
};

export type MetodeKerjaSubKategoriInsert = {
  disiplin: string;
  kode: string;
  nama: string;
  sortOrder: number;
  evidenceUrl: string | null;
  note: string | null;
  createdBy: string;
};

export type MetodeKerjaSubKategoriUpdate = {
  kode: string;
  nama: string;
  evidenceUrl: string | null;
  note: string | null;
  updatedBy: string;
};

export type MetodeKerjaItemInsert = {
  subKategoriId: string;
  kode: string;
  nama: string;
  sortOrder: number;
  evidenceUrl: string | null;
  note: string | null;
  createdBy: string;
};

export type MetodeKerjaItemUpdate = {
  kode: string;
  nama: string;
  evidenceUrl: string | null;
  note: string | null;
  updatedBy: string;
};

export type MetodeKerjaPicTarget = {
  subKategoriId?: string | null;
  itemId?: string | null;
};

const subKategoriColumns = {
  id: metodeKerjaSubKategori.id,
  disiplin: metodeKerjaSubKategori.disiplin,
  kode: metodeKerjaSubKategori.kode,
  nama: metodeKerjaSubKategori.nama,
  sortOrder: metodeKerjaSubKategori.sortOrder,
  evidenceUrl: metodeKerjaSubKategori.evidenceUrl,
  note: metodeKerjaSubKategori.note,
  createdById: metodeKerjaSubKategori.createdBy,
  updatedById: metodeKerjaSubKategori.updatedBy,
  createdAt: metodeKerjaSubKategori.createdAt,
  updatedAt: metodeKerjaSubKategori.updatedAt,
};

const itemColumns = {
  id: metodeKerjaItem.id,
  subKategoriId: metodeKerjaItem.subKategoriId,
  kode: metodeKerjaItem.kode,
  nama: metodeKerjaItem.nama,
  sortOrder: metodeKerjaItem.sortOrder,
  evidenceUrl: metodeKerjaItem.evidenceUrl,
  note: metodeKerjaItem.note,
  createdById: metodeKerjaItem.createdBy,
  updatedById: metodeKerjaItem.updatedBy,
  createdAt: metodeKerjaItem.createdAt,
  updatedAt: metodeKerjaItem.updatedAt,
};

export async function listSubKategoriRows(
  disiplin: string,
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<MetodeKerjaSubKategoriRow[]> {
  return db
    .select(subKategoriColumns)
    .from(metodeKerjaSubKategori)
    .where(eq(metodeKerjaSubKategori.disiplin, disiplin))
    .orderBy(
      asc(metodeKerjaSubKategori.sortOrder),
      asc(metodeKerjaSubKategori.createdAt),
      asc(metodeKerjaSubKategori.id),
    );
}

export async function listAllSubKategoriRows(
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<MetodeKerjaSubKategoriRow[]> {
  return db
    .select(subKategoriColumns)
    .from(metodeKerjaSubKategori)
    .orderBy(
      asc(metodeKerjaSubKategori.disiplin),
      asc(metodeKerjaSubKategori.sortOrder),
      asc(metodeKerjaSubKategori.createdAt),
      asc(metodeKerjaSubKategori.id),
    );
}

export async function listItemsForSubKategoriIds(
  subKategoriIds: readonly string[],
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<MetodeKerjaItemRow[]> {
  if (subKategoriIds.length === 0) {
    return [];
  }
  return db
    .select(itemColumns)
    .from(metodeKerjaItem)
    .where(inArray(metodeKerjaItem.subKategoriId, [...subKategoriIds]))
    .orderBy(
      asc(metodeKerjaItem.sortOrder),
      asc(metodeKerjaItem.createdAt),
      asc(metodeKerjaItem.id),
    );
}

export async function listAllItemRows(
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<MetodeKerjaItemRow[]> {
  return db
    .select(itemColumns)
    .from(metodeKerjaItem)
    .orderBy(
      asc(metodeKerjaItem.subKategoriId),
      asc(metodeKerjaItem.sortOrder),
      asc(metodeKerjaItem.createdAt),
      asc(metodeKerjaItem.id),
    );
}

export async function findSubKategoriById(
  id: string,
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<MetodeKerjaSubKategoriRow | null> {
  const rows = await db
    .select(subKategoriColumns)
    .from(metodeKerjaSubKategori)
    .where(eq(metodeKerjaSubKategori.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function findItemById(
  id: string,
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<MetodeKerjaItemRow | null> {
  const rows = await db
    .select(itemColumns)
    .from(metodeKerjaItem)
    .where(eq(metodeKerjaItem.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function listPicsForSubKategoriIds(
  subKategoriIds: readonly string[],
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<MetodeKerjaPicRow[]> {
  if (subKategoriIds.length === 0) {
    return [];
  }
  return db
    .select({
      picId: metodeKerjaPic.id,
      subKategoriId: metodeKerjaPic.subKategoriId,
      itemId: metodeKerjaPic.itemId,
      userId: users.id,
      name: users.name,
      status: users.status,
      position: users.position,
    })
    .from(metodeKerjaPic)
    .innerJoin(users, eq(metodeKerjaPic.userId, users.id))
    .where(inArray(metodeKerjaPic.subKategoriId, [...subKategoriIds]))
    .orderBy(asc(users.name), asc(users.id));
}

export async function listPicsForItemIds(
  itemIds: readonly string[],
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<MetodeKerjaPicRow[]> {
  if (itemIds.length === 0) {
    return [];
  }
  return db
    .select({
      picId: metodeKerjaPic.id,
      subKategoriId: metodeKerjaPic.subKategoriId,
      itemId: metodeKerjaPic.itemId,
      userId: users.id,
      name: users.name,
      status: users.status,
      position: users.position,
    })
    .from(metodeKerjaPic)
    .innerJoin(users, eq(metodeKerjaPic.userId, users.id))
    .where(inArray(metodeKerjaPic.itemId, [...itemIds]))
    .orderBy(asc(users.name), asc(users.id));
}

export async function listUsersByIds(
  ids: readonly string[],
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<MetodeKerjaUserRow[]> {
  if (ids.length === 0) {
    return [];
  }
  return db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(inArray(users.id, [...ids]));
}

export async function listPicOptions(
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<MetodeKerjaPicOptionRow[]> {
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

export async function nextSubKategoriSortOrder(
  disiplin: string,
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<number> {
  const rows = await db
    .select({ value: max(metodeKerjaSubKategori.sortOrder) })
    .from(metodeKerjaSubKategori)
    .where(eq(metodeKerjaSubKategori.disiplin, disiplin));
  return Number(rows[0]?.value ?? 0) + 10;
}

export async function nextItemSortOrder(
  subKategoriId: string,
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<number> {
  const rows = await db
    .select({ value: max(metodeKerjaItem.sortOrder) })
    .from(metodeKerjaItem)
    .where(eq(metodeKerjaItem.subKategoriId, subKategoriId));
  return Number(rows[0]?.value ?? 0) + 10;
}

export async function insertSubKategori(
  data: MetodeKerjaSubKategoriInsert,
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<string> {
  const rows = await db
    .insert(metodeKerjaSubKategori)
    .values({ ...data, updatedBy: null })
    .returning({ id: metodeKerjaSubKategori.id });
  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create Metode Kerja sub-kategori");
  }
  return created.id;
}

export async function updateSubKategori(
  id: string,
  data: MetodeKerjaSubKategoriUpdate,
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<boolean> {
  const rows = await db
    .update(metodeKerjaSubKategori)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(metodeKerjaSubKategori.id, id))
    .returning({ id: metodeKerjaSubKategori.id });
  return rows.length > 0;
}

export async function deleteSubKategori(
  id: string,
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<boolean> {
  const rows = await db
    .delete(metodeKerjaSubKategori)
    .where(eq(metodeKerjaSubKategori.id, id))
    .returning({ id: metodeKerjaSubKategori.id });
  return rows.length > 0;
}

export async function countItemsInSubKategori(
  subKategoriId: string,
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<number> {
  const rows = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(metodeKerjaItem)
    .where(eq(metodeKerjaItem.subKategoriId, subKategoriId));
  return Number(rows[0]?.value ?? 0);
}

export async function insertItem(
  data: MetodeKerjaItemInsert,
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<string> {
  const rows = await db
    .insert(metodeKerjaItem)
    .values({ ...data, updatedBy: null })
    .returning({ id: metodeKerjaItem.id });
  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create Metode Kerja item");
  }
  return created.id;
}

export async function updateItem(
  id: string,
  data: MetodeKerjaItemUpdate,
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<boolean> {
  const rows = await db
    .update(metodeKerjaItem)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(metodeKerjaItem.id, id))
    .returning({ id: metodeKerjaItem.id });
  return rows.length > 0;
}

export async function deleteItem(
  id: string,
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<boolean> {
  const rows = await db
    .delete(metodeKerjaItem)
    .where(eq(metodeKerjaItem.id, id))
    .returning({ id: metodeKerjaItem.id });
  return rows.length > 0;
}

export async function replacePics(
  target: MetodeKerjaPicTarget,
  userIds: readonly string[],
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<void> {
  const subKategoriId: string | null = target.subKategoriId ?? null;
  const itemId: string | null = target.itemId ?? null;

  if ((subKategoriId === null) === (itemId === null)) {
    throw new Error("PIC target must contain exactly one of subKategoriId/itemId");
  }

  if (subKategoriId !== null) {
    await db
      .delete(metodeKerjaPic)
      .where(eq(metodeKerjaPic.subKategoriId, subKategoriId));
  } else {
    if (itemId === null) {
      throw new Error("PIC target must contain exactly one of subKategoriId/itemId");
    }
    await db.delete(metodeKerjaPic).where(eq(metodeKerjaPic.itemId, itemId));
  }

  if (userIds.length === 0) {
    return;
  }

  await db.insert(metodeKerjaPic).values(
    userIds.map((userId) => ({
      subKategoriId,
      itemId,
      userId,
    })),
  );
}

export async function listReorderSubKategoriIds(
  disiplin: string,
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<string[]> {
  const rows = await db
    .select({ id: metodeKerjaSubKategori.id })
    .from(metodeKerjaSubKategori)
    .where(eq(metodeKerjaSubKategori.disiplin, disiplin));
  return rows.map((row) => row.id);
}

export async function listReorderItemIds(
  subKategoriId: string,
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<string[]> {
  const rows = await db
    .select({ id: metodeKerjaItem.id })
    .from(metodeKerjaItem)
    .where(eq(metodeKerjaItem.subKategoriId, subKategoriId));
  return rows.map((row) => row.id);
}

export async function updateSortOrders(
  entity: "sub_kategori" | "item",
  orderedIds: readonly string[],
  updatedBy: string,
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<void> {
  const updatedAt = new Date();
  for (let index = 0; index < orderedIds.length; index += 1) {
    const id = orderedIds[index];
    if (!id) continue;
    const sortOrder = (index + 1) * 10;
    if (entity === "sub_kategori") {
      await db
        .update(metodeKerjaSubKategori)
        .set({ sortOrder, updatedBy, updatedAt })
        .where(eq(metodeKerjaSubKategori.id, id));
    } else {
      await db
        .update(metodeKerjaItem)
        .set({ sortOrder, updatedBy, updatedAt })
        .where(eq(metodeKerjaItem.id, id));
    }
  }
}

export type MetodeKerjaDisiplinCount = {
  disiplin: string;
  subKategoriCount: number;
  itemCount: number;
};

export async function listDisiplinCounts(
  db: MetodeKerjaDb = dbOrDefault(),
): Promise<MetodeKerjaDisiplinCount[]> {
  const subRows = await db
    .select({
      disiplin: metodeKerjaSubKategori.disiplin,
      value: sql<number>`count(*)::int`,
    })
    .from(metodeKerjaSubKategori)
    .groupBy(metodeKerjaSubKategori.disiplin);

  const itemRows = await db
    .select({
      disiplin: metodeKerjaSubKategori.disiplin,
      value: sql<number>`count(*)::int`,
    })
    .from(metodeKerjaItem)
    .innerJoin(
      metodeKerjaSubKategori,
      eq(metodeKerjaItem.subKategoriId, metodeKerjaSubKategori.id),
    )
    .groupBy(metodeKerjaSubKategori.disiplin);

  const counts = new Map<string, MetodeKerjaDisiplinCount>();
  for (const row of subRows) {
    counts.set(row.disiplin, {
      disiplin: row.disiplin,
      subKategoriCount: Number(row.value),
      itemCount: 0,
    });
  }
  for (const row of itemRows) {
    const current = counts.get(row.disiplin);
    if (current) {
      current.itemCount = Number(row.value);
    } else {
      counts.set(row.disiplin, {
        disiplin: row.disiplin,
        subKategoriCount: 0,
        itemCount: Number(row.value),
      });
    }
  }
  return [...counts.values()];
}
