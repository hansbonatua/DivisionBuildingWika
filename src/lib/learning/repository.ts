import { and, asc, eq, ilike, inArray, max, sql } from "drizzle-orm";
import { getPgDb, type PgDatabase } from "@/lib/pg/client";
import {
  learningAttachments,
  learningCategories,
  learningContents,
} from "@/lib/pg/schema";

// Server-only persistence for Building Learning Center. Business rules
// (permissions, type/payload rules, upload verification, blob cleanup) belong to
// service.ts. Every query returns camelCase rows; the service maps them to the
// snake_case API DTOs.

type PgTransaction = Parameters<Parameters<PgDatabase["transaction"]>[0]>[0];
export type LearningDb = PgDatabase | PgTransaction;

function dbOrDefault(db?: LearningDb): LearningDb {
  return db ?? getPgDb();
}

export type LearningCategoryRow = {
  id: string;
  nama: string;
  sortOrder: number;
  contentCount: number;
  createdById: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LearningContentRow = {
  id: string;
  type: string;
  judul: string;
  deskripsi: string | null;
  kategoriId: string;
  kategoriNama: string;
  thumbnailUrl: string;
  thumbnailPathname: string;
  videoUrl: string | null;
  externalUrl: string | null;
  sortOrder: number;
  createdById: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LearningContentListRow = LearningContentRow & {
  attachmentCount: number;
};

export type LearningAttachmentRow = {
  id: string;
  contentId: string;
  nama: string;
  filePathname: string;
  fileName: string;
  fileMimeType: string;
  fileSizeBytes: number;
  sortOrder: number;
  createdById: string;
  createdAt: Date;
};

export type LearningContentInsert = {
  type: string;
  judul: string;
  deskripsi: string | null;
  kategoriId: string;
  thumbnailUrl: string;
  thumbnailPathname: string;
  videoUrl: string | null;
  externalUrl: string | null;
  sortOrder: number;
  createdBy: string;
};

export type LearningContentUpdate = {
  judul?: string;
  deskripsi?: string | null;
  kategoriId?: string;
  thumbnailUrl?: string;
  thumbnailPathname?: string;
  videoUrl?: string | null;
  externalUrl?: string | null;
  updatedBy: string;
};

export type LearningAttachmentInsert = {
  contentId: string;
  contentType: string;
  nama: string;
  filePathname: string;
  fileName: string;
  fileMimeType: string;
  fileSizeBytes: number;
  sortOrder: number;
  createdBy: string;
};

export type LearningContentListParams = {
  type: string;
  categoryId?: string;
  search?: string;
  limit: number;
  offset: number;
};

const categoryColumns = {
  id: learningCategories.id,
  nama: learningCategories.nama,
  sortOrder: learningCategories.sortOrder,
  createdById: learningCategories.createdBy,
  updatedById: learningCategories.updatedBy,
  createdAt: learningCategories.createdAt,
  updatedAt: learningCategories.updatedAt,
};

const contentColumns = {
  id: learningContents.id,
  type: learningContents.type,
  judul: learningContents.judul,
  deskripsi: learningContents.deskripsi,
  kategoriId: learningContents.kategoriId,
  kategoriNama: learningCategories.nama,
  thumbnailUrl: learningContents.thumbnailUrl,
  thumbnailPathname: learningContents.thumbnailPathname,
  videoUrl: learningContents.videoUrl,
  externalUrl: learningContents.externalUrl,
  sortOrder: learningContents.sortOrder,
  createdById: learningContents.createdBy,
  updatedById: learningContents.updatedBy,
  createdAt: learningContents.createdAt,
  updatedAt: learningContents.updatedAt,
};

const attachmentColumns = {
  id: learningAttachments.id,
  contentId: learningAttachments.contentId,
  nama: learningAttachments.nama,
  filePathname: learningAttachments.filePathname,
  fileName: learningAttachments.fileName,
  fileMimeType: learningAttachments.fileMimeType,
  fileSizeBytes: learningAttachments.fileSizeBytes,
  sortOrder: learningAttachments.sortOrder,
  createdById: learningAttachments.createdBy,
  createdAt: learningAttachments.createdAt,
};

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function contentFilter(params: {
  type: string;
  categoryId?: string;
  search?: string;
}) {
  const term = params.search?.trim();
  return and(
    eq(learningContents.type, params.type),
    params.categoryId
      ? eq(learningContents.kategoriId, params.categoryId)
      : undefined,
    term
      ? ilike(learningContents.judul, `%${escapeLikePattern(term)}%`)
      : undefined,
  );
}

const attachmentCountExpression = sql<number>`(
  select count(*)::int
  from ${learningAttachments}
  where ${learningAttachments.contentId} = ${learningContents.id}
)`;

export async function listCategoryRows(
  db: LearningDb = dbOrDefault(),
): Promise<LearningCategoryRow[]> {
  return db
    .select({
      ...categoryColumns,
      contentCount: sql<number>`(
        select count(*)::int
        from ${learningContents}
        where ${learningContents.kategoriId} = ${learningCategories.id}
      )`,
    })
    .from(learningCategories)
    .orderBy(
      asc(learningCategories.sortOrder),
      asc(learningCategories.nama),
      asc(learningCategories.id),
    );
}

export async function findCategoryById(
  id: string,
  db: LearningDb = dbOrDefault(),
): Promise<LearningCategoryRow | null> {
  const rows = await db
    .select({
      ...categoryColumns,
      contentCount: sql<number>`(
        select count(*)::int
        from ${learningContents}
        where ${learningContents.kategoriId} = ${learningCategories.id}
      )`,
    })
    .from(learningCategories)
    .where(eq(learningCategories.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Case- and whitespace-insensitive lookup used by find-or-create. */
export async function findCategoryByName(
  nama: string,
  db: LearningDb = dbOrDefault(),
): Promise<LearningCategoryRow | null> {
  const rows = await db
    .select({
      ...categoryColumns,
      contentCount: sql<number>`(
        select count(*)::int
        from ${learningContents}
        where ${learningContents.kategoriId} = ${learningCategories.id}
      )`,
    })
    .from(learningCategories)
    .where(
      sql`lower(btrim(${learningCategories.nama})) = lower(btrim(${nama}))`,
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function nextCategorySortOrder(
  db: LearningDb = dbOrDefault(),
): Promise<number> {
  const rows = await db
    .select({ value: max(learningCategories.sortOrder) })
    .from(learningCategories);
  return Number(rows[0]?.value ?? 0) + 10;
}

export async function insertCategory(
  data: { nama: string; sortOrder: number; createdBy: string },
  db: LearningDb = dbOrDefault(),
): Promise<string> {
  const rows = await db
    .insert(learningCategories)
    .values({ ...data, updatedBy: null })
    .returning({ id: learningCategories.id });
  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create learning category");
  }
  return created.id;
}

export async function listContentRows(
  params: LearningContentListParams,
  db: LearningDb = dbOrDefault(),
): Promise<LearningContentListRow[]> {
  return db
    .select({
      ...contentColumns,
      attachmentCount: attachmentCountExpression,
    })
    .from(learningContents)
    .innerJoin(
      learningCategories,
      eq(learningContents.kategoriId, learningCategories.id),
    )
    .where(contentFilter(params))
    .orderBy(
      asc(learningContents.sortOrder),
      asc(learningContents.createdAt),
      asc(learningContents.id),
    )
    .limit(params.limit)
    .offset(params.offset);
}

export async function countContentRows(
  params: { type: string; categoryId?: string; search?: string },
  db: LearningDb = dbOrDefault(),
): Promise<number> {
  const rows = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(learningContents)
    .where(contentFilter(params));
  return Number(rows[0]?.value ?? 0);
}

export async function findContentById(
  id: string,
  db: LearningDb = dbOrDefault(),
): Promise<LearningContentRow | null> {
  const rows = await db
    .select(contentColumns)
    .from(learningContents)
    .innerJoin(
      learningCategories,
      eq(learningContents.kategoriId, learningCategories.id),
    )
    .where(eq(learningContents.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Ownership probe used by orphan cleanup. */
export async function findContentByThumbnailPathname(
  pathname: string,
  db: LearningDb = dbOrDefault(),
): Promise<{ id: string } | null> {
  const rows = await db
    .select({ id: learningContents.id })
    .from(learningContents)
    .where(eq(learningContents.thumbnailPathname, pathname))
    .limit(1);
  return rows[0] ?? null;
}

/** Ownership probe used by orphan cleanup. */
export async function findAttachmentByFilePathname(
  pathname: string,
  db: LearningDb = dbOrDefault(),
): Promise<{ id: string } | null> {
  const rows = await db
    .select({ id: learningAttachments.id })
    .from(learningAttachments)
    .where(eq(learningAttachments.filePathname, pathname))
    .limit(1);
  return rows[0] ?? null;
}

export async function nextContentSortOrder(
  type: string,
  db: LearningDb = dbOrDefault(),
): Promise<number> {
  const rows = await db
    .select({ value: max(learningContents.sortOrder) })
    .from(learningContents)
    .where(eq(learningContents.type, type));
  return Number(rows[0]?.value ?? 0) + 10;
}

export async function insertContent(
  data: LearningContentInsert,
  db: LearningDb = dbOrDefault(),
): Promise<string> {
  const rows = await db
    .insert(learningContents)
    .values({ ...data, updatedBy: null })
    .returning({ id: learningContents.id });
  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create learning content");
  }
  return created.id;
}

export async function updateContent(
  id: string,
  data: LearningContentUpdate,
  db: LearningDb = dbOrDefault(),
): Promise<boolean> {
  const rows = await db
    .update(learningContents)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(learningContents.id, id))
    .returning({ id: learningContents.id });
  return rows.length > 0;
}

export async function deleteContent(
  id: string,
  db: LearningDb = dbOrDefault(),
): Promise<boolean> {
  const rows = await db
    .delete(learningContents)
    .where(eq(learningContents.id, id))
    .returning({ id: learningContents.id });
  return rows.length > 0;
}

export async function listAttachmentRows(
  contentId: string,
  db: LearningDb = dbOrDefault(),
): Promise<LearningAttachmentRow[]> {
  return db
    .select(attachmentColumns)
    .from(learningAttachments)
    .where(eq(learningAttachments.contentId, contentId))
    .orderBy(
      asc(learningAttachments.sortOrder),
      asc(learningAttachments.createdAt),
      asc(learningAttachments.id),
    );
}

export async function findAttachmentById(
  id: string,
  db: LearningDb = dbOrDefault(),
): Promise<LearningAttachmentRow | null> {
  const rows = await db
    .select(attachmentColumns)
    .from(learningAttachments)
    .where(eq(learningAttachments.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertAttachments(
  rows: LearningAttachmentInsert[],
  db: LearningDb = dbOrDefault(),
): Promise<void> {
  if (rows.length === 0) return;
  await db.insert(learningAttachments).values(rows);
}

export async function updateAttachment(
  id: string,
  data: { nama?: string; sortOrder?: number },
  db: LearningDb = dbOrDefault(),
): Promise<boolean> {
  const rows = await db
    .update(learningAttachments)
    .set(data)
    .where(eq(learningAttachments.id, id))
    .returning({ id: learningAttachments.id });
  return rows.length > 0;
}

export async function deleteAttachmentsByIds(
  ids: readonly string[],
  db: LearningDb = dbOrDefault(),
): Promise<void> {
  if (ids.length === 0) return;
  await db
    .delete(learningAttachments)
    .where(inArray(learningAttachments.id, [...ids]));
}
