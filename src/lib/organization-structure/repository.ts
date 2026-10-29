import { eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getPgDb } from "@/lib/pg/client";
import { organizationStructure, users } from "@/lib/pg/schema";

// Struktur Organisasi data access. Pure SQL: no HTTP, no permissions, no
// business rules.
//
// The table holds at most ONE row (CHECK + UNIQUE on `singleton`), so every
// function here is intentionally singleton-shaped: `findRow()` has no filter
// argument and returns the single row or null, and there is no "list" API.
//
// `blob_pathname` never leaves the server: the service DTO deliberately omits
// it, so it is selected here only for ownership/cleanup decisions.

export type OrganizationStructureRow = {
  id: string;
  imageUrl: string;
  blobPathname: string;
  fileName: string | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OrganizationStructureRowWithActor = OrganizationStructureRow & {
  // Resolved server-side so the UI never needs a second request: the last
  // updater's name, falling back to the original uploader's name.
  updatedByName: string | null;
};

// Second join needs its own alias because `users` is referenced twice.
const creator = alias(users, "organization_structure_creator");

const rowColumns = {
  id: organizationStructure.id,
  imageUrl: organizationStructure.imageUrl,
  blobPathname: organizationStructure.blobPathname,
  fileName: organizationStructure.fileName,
  createdBy: organizationStructure.createdBy,
  updatedBy: organizationStructure.updatedBy,
  createdAt: organizationStructure.createdAt,
  updatedAt: organizationStructure.updatedAt,
};

const rowColumnsWithActor = {
  ...rowColumns,
  updaterName: users.name,
  creatorName: creator.name,
};

export async function findRow(): Promise<OrganizationStructureRowWithActor | null> {
  const rows = await getPgDb()
    .select(rowColumnsWithActor)
    .from(organizationStructure)
    // LEFT joins: `created_by` always resolves, `updated_by` may be NULL (and
    // may become NULL again if the updater's account is deleted).
    .leftJoin(users, eq(organizationStructure.updatedBy, users.id))
    .leftJoin(creator, eq(organizationStructure.createdBy, creator.id))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }
  const { updaterName, creatorName, ...rest } = row;
  return {
    ...rest,
    updatedByName: updaterName ?? creatorName ?? null,
  };
}

/**
 * Inserts the single row. The caller handles the first-create race: the UNIQUE
 * constraint on `singleton` makes a concurrent second insert fail with 23505,
 * which the service retries as an update.
 */
export async function insertRow(data: {
  imageUrl: string;
  blobPathname: string;
  fileName: string | null;
  actorId: string;
}): Promise<string> {
  const rows = await getPgDb()
    .insert(organizationStructure)
    .values({
      imageUrl: data.imageUrl,
      blobPathname: data.blobPathname,
      fileName: data.fileName,
      createdBy: data.actorId,
      updatedBy: data.actorId,
    })
    .returning({ id: organizationStructure.id });

  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create organization structure");
  }
  return created.id;
}

/**
 * Replaces the image of the existing row. `createdBy`/`createdAt` are owned by
 * the insert path and are never touched here; `updatedAt` always moves.
 *
 * Synchronous with the singleton: there is no WHERE on an id, because the row
 * is unique and the id is meaningless to callers (nothing routes by it).
 */
export async function updateRowImage(data: {
  imageUrl: string;
  blobPathname: string;
  fileName: string | null;
  actorId: string;
}): Promise<boolean> {
  const rows = await getPgDb()
    .update(organizationStructure)
    .set({
      imageUrl: data.imageUrl,
      blobPathname: data.blobPathname,
      fileName: data.fileName,
      updatedBy: data.actorId,
      updatedAt: new Date(),
    })
    .where(eq(organizationStructure.singleton, true))
    .returning({ id: organizationStructure.id });
  return rows.length > 0;
}

/** Removes the row. Returns the deleted row (if any) so its object can be reclaimed. */
export async function deleteRow(): Promise<{ id: string } | null> {
  const rows = await getPgDb()
    .delete(organizationStructure)
    .returning({ id: organizationStructure.id });
  return rows[0] ?? null;
}

/**
 * True when the active chart still points at this stored pathname.
 * Consumed by @/lib/cms/image-references so the shared CMS orphan cleanup can
 * never delete the live chart (fails closed at the caller).
 */
export async function existsByBlobPathname(pathname: string): Promise<boolean> {
  if (typeof pathname !== "string" || pathname.length === 0) {
    return false;
  }
  const rows = await getPgDb()
    .select({ one: sql<number>`1` })
    .from(organizationStructure)
    .where(eq(organizationStructure.blobPathname, pathname))
    .limit(1);
  return rows.length > 0;
}
