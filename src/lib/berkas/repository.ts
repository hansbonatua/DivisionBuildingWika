import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { getPgDb, type PgDatabase } from "@/lib/pg/client";
import {
  berkasPengajuan,
  berkasPenyusun,
  berkasValidasi,
  users,
  type BerkasStatus,
} from "@/lib/pg/schema";

// Server-only persistence for Berkas. Authorization, upload verification and
// transition rules stay in the service; this module only builds queries and
// performs the parent + children transaction.

type PgTransaction = Parameters<Parameters<PgDatabase["transaction"]>[0]>[0];
export type BerkasDb = PgDatabase | PgTransaction;

const parentColumns = {
  id: berkasPengajuan.id,
  judul: berkasPengajuan.judul,
  kodeSeri: berkasPengajuan.kodeSeri,
  catatan: berkasPengajuan.catatan,
  rejectionReason: berkasPengajuan.rejectionReason,
  rejectedAt: berkasPengajuan.rejectedAt,
  rejectedBy: berkasPengajuan.rejectedBy,
  revisionCount: berkasPengajuan.revisionCount,
  pemohonId: berkasPengajuan.pemohonId,
  pemohonName: users.name,
  originalPdfPathname: berkasPengajuan.originalPdfPathname,
  originalPdfName: berkasPengajuan.originalPdfName,
  originalPdfSizeBytes: berkasPengajuan.originalPdfSizeBytes,
  status: berkasPengajuan.status,
  version: berkasPengajuan.version,
  submittedAt: berkasPengajuan.submittedAt,
  completedAt: berkasPengajuan.completedAt,
  createdAt: berkasPengajuan.createdAt,
  updatedAt: berkasPengajuan.updatedAt,
};

export type BerkasListRow = {
  id: string;
  judul: string;
  kodeSeri: string | null;
  catatan: string | null;
  rejectionReason: string | null;
  rejectedAt: Date | null;
  rejectedBy: string | null;
  revisionCount: number;
  pemohonId: string;
  pemohonName: string;
  originalPdfPathname: string;
  originalPdfName: string;
  originalPdfSizeBytes: number;
  status: string;
  version: number;
  submittedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BerkasPenyusunRow = {
  id: string;
  userId: string;
  namaSnapshot: string;
  jabatanSnapshot: string;
  urutan: number;
  ttdPathname: string;
  ttdMimeType: string;
  ttdSizeBytes: number;
  ttdUploadedAt: Date;
};

export type BerkasValidasiRow = {
  id: string;
  urutan: number;
  validatorUserId: string;
  namaSnapshot: string;
  jabatanSnapshot: string;
  ttdPathname: string | null;
  ttdMimeType: string | null;
  ttdSizeBytes: number | null;
  ttdUploadedAt: Date | null;
};

export type BerkasDetailRow = BerkasListRow & {
  penyusun: BerkasPenyusunRow[];
  validasi: BerkasValidasiRow[];
};

export type BerkasFileRow = {
  id: string;
  pemohonId: string;
  originalPdfPathname: string;
  originalPdfName: string;
  originalPdfMimeType: string;
  originalPdfSizeBytes: number;
};

export type BerkasDownloadRow = {
  id: string;
  judul: string;
  pemohonId: string;
  status: string;
  generatedPdfPathname: string | null;
  generatedPdfSizeBytes: number | null;
};

export type InsertBerkasInput = {
  judul: string;
  kodeSeri: string | null;
  pemohonId: string;
  originalPdfPathname: string;
  originalPdfName: string;
  originalPdfMimeType: string;
  originalPdfSizeBytes: number;
  originalPdfPageCount: number;
  penyusun: Array<{
    userId: string;
    namaSnapshot: string;
    jabatanSnapshot: string;
    urutan: number;
    ttdPathname: string;
    ttdMimeType: string;
    ttdSizeBytes: number;
  }>;
  validasi: Array<{
    userId: string;
    urutan: number;
    namaSnapshot: string;
    jabatanSnapshot: string;
  }>;
};

export type BerkasAssignmentRow = {
  berkasId: string;
  urutan: number;
  ttdPathname: string | null;
  ttdUploadedAt: Date | null;
};

export type BerkasStatusPatch = {
  status?: BerkasStatus;
  catatan?: string | null;
  completedAt?: Date | null;
  generatedPdfPathname?: string | null;
  generatedPdfSizeBytes?: number | null;
};

function dbOrDefault(db?: BerkasDb): BerkasDb {
  return db ?? getPgDb();
}

export async function listBerkasRows(
  pemohonId?: string,
): Promise<BerkasListRow[]> {
  const query = getPgDb()
    .select(parentColumns)
    .from(berkasPengajuan)
    .innerJoin(users, eq(berkasPengajuan.pemohonId, users.id));

  if (pemohonId) {
    return query
      .where(eq(berkasPengajuan.pemohonId, pemohonId))
      .orderBy(desc(berkasPengajuan.createdAt), desc(berkasPengajuan.id));
  }

  return query.orderBy(
    desc(berkasPengajuan.createdAt),
    desc(berkasPengajuan.id),
  );
}

export type BerkasPageInput = {
  pemohonId?: string;
  search?: string;
  page: number;
  limit: number;
};

export type BerkasPageResult = {
  rows: BerkasListRow[];
  totalData: number;
};

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/** Paginated list used by GET /api/berkas; filters never bypass row scope. */
export async function listBerkasPage(
  input: BerkasPageInput,
): Promise<BerkasPageResult> {
  const conditions = [];
  if (input.pemohonId) {
    conditions.push(eq(berkasPengajuan.pemohonId, input.pemohonId));
  }
  const search = input.search?.trim();
  if (search) {
    const pattern = `%${escapeLikePattern(search)}%`;
    const matching = or(
      ilike(berkasPengajuan.judul, pattern),
      ilike(berkasPengajuan.kodeSeri, pattern),
      ilike(users.name, pattern),
    );
    if (matching) conditions.push(matching);
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await getPgDb()
    .select(parentColumns)
    .from(berkasPengajuan)
    .innerJoin(users, eq(berkasPengajuan.pemohonId, users.id))
    .where(where)
    .orderBy(desc(berkasPengajuan.createdAt), desc(berkasPengajuan.id))
    .limit(input.limit)
    .offset((input.page - 1) * input.limit);

  const totalRows = await getPgDb()
    .select({ total: count() })
    .from(berkasPengajuan)
    .innerJoin(users, eq(berkasPengajuan.pemohonId, users.id))
    .where(where);

  return { rows, totalData: Number(totalRows[0]?.total ?? 0) };
}

export async function countBerkasNeedsAction(
  userId: string,
): Promise<number> {
  const [validatorRows, rejectedRows] = await Promise.all([
    getPgDb()
      .select({ total: count() })
      .from(berkasValidasi)
      .innerJoin(
        berkasPengajuan,
        eq(berkasValidasi.berkasId, berkasPengajuan.id),
      )
      .where(
        and(
          eq(berkasValidasi.validatorUserId, userId),
          isNull(berkasValidasi.ttdPathname),
          or(
            and(
              eq(berkasValidasi.urutan, 1),
              eq(berkasPengajuan.status, "MENUNGGU_TTD_1"),
            ),
            and(
              eq(berkasValidasi.urutan, 2),
              eq(berkasPengajuan.status, "MENUNGGU_TTD_2"),
            ),
          ),
        ),
      ),
    getPgDb()
      .select({ total: count() })
      .from(berkasPengajuan)
      .where(
        and(
          eq(berkasPengajuan.pemohonId, userId),
          eq(berkasPengajuan.status, "DITOLAK"),
        ),
      ),
  ]);

  return (
    Number(validatorRows[0]?.total ?? 0) +
    Number(rejectedRows[0]?.total ?? 0)
  );
}

export async function listBerkasAssignmentsByUser(
  validatorUserId: string,
  berkasIds?: string[],
): Promise<BerkasAssignmentRow[]> {
  if (berkasIds && berkasIds.length === 0) return [];

  const condition = berkasIds
    ? and(
        eq(berkasValidasi.validatorUserId, validatorUserId),
        inArray(berkasValidasi.berkasId, berkasIds),
      )
    : eq(berkasValidasi.validatorUserId, validatorUserId);

  return getPgDb()
    .select({
      berkasId: berkasValidasi.berkasId,
      urutan: berkasValidasi.urutan,
      ttdPathname: berkasValidasi.ttdPathname,
      ttdUploadedAt: berkasValidasi.ttdUploadedAt,
    })
    .from(berkasValidasi)
    .where(condition)
    .orderBy(asc(berkasValidasi.berkasId), asc(berkasValidasi.urutan));
}

export async function findBerkasDetailRowById(
  id: string,
): Promise<BerkasDetailRow | null> {
  const parentRows = await getPgDb()
    .select(parentColumns)
    .from(berkasPengajuan)
    .innerJoin(users, eq(berkasPengajuan.pemohonId, users.id))
    .where(eq(berkasPengajuan.id, id))
    .limit(1);

  const parent = parentRows[0];
  if (!parent) return null;

  const [penyusun, validasi] = await Promise.all([
    getPgDb()
      .select({
        id: berkasPenyusun.id,
        userId: berkasPenyusun.userId,
        namaSnapshot: berkasPenyusun.namaSnapshot,
        jabatanSnapshot: berkasPenyusun.jabatanSnapshot,
        urutan: berkasPenyusun.urutan,
        ttdPathname: berkasPenyusun.ttdPathname,
        ttdMimeType: berkasPenyusun.ttdMimeType,
        ttdSizeBytes: berkasPenyusun.ttdSizeBytes,
        ttdUploadedAt: berkasPenyusun.ttdUploadedAt,
      })
      .from(berkasPenyusun)
      .where(eq(berkasPenyusun.berkasId, id))
      .orderBy(asc(berkasPenyusun.urutan), asc(berkasPenyusun.id)),
    getPgDb()
      .select({
        id: berkasValidasi.id,
        urutan: berkasValidasi.urutan,
        validatorUserId: berkasValidasi.validatorUserId,
        namaSnapshot: berkasValidasi.namaSnapshot,
        jabatanSnapshot: berkasValidasi.jabatanSnapshot,
        ttdPathname: berkasValidasi.ttdPathname,
        ttdMimeType: berkasValidasi.ttdMimeType,
        ttdSizeBytes: berkasValidasi.ttdSizeBytes,
        ttdUploadedAt: berkasValidasi.ttdUploadedAt,
      })
      .from(berkasValidasi)
      .where(eq(berkasValidasi.berkasId, id))
      .orderBy(asc(berkasValidasi.urutan), asc(berkasValidasi.id)),
  ]);

  return { ...parent, penyusun, validasi };
}

export async function findBerkasFileRowById(
  id: string,
): Promise<BerkasFileRow | null> {
  const rows = await getPgDb()
    .select({
      id: berkasPengajuan.id,
      pemohonId: berkasPengajuan.pemohonId,
      originalPdfPathname: berkasPengajuan.originalPdfPathname,
      originalPdfName: berkasPengajuan.originalPdfName,
      originalPdfMimeType: berkasPengajuan.originalPdfMimeType,
      originalPdfSizeBytes: berkasPengajuan.originalPdfSizeBytes,
    })
    .from(berkasPengajuan)
    .where(eq(berkasPengajuan.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function findBerkasDownloadRowById(
  id: string,
): Promise<BerkasDownloadRow | null> {
  const rows = await getPgDb()
    .select({
      id: berkasPengajuan.id,
      judul: berkasPengajuan.judul,
      pemohonId: berkasPengajuan.pemohonId,
      status: berkasPengajuan.status,
      generatedPdfPathname: berkasPengajuan.generatedPdfPathname,
      generatedPdfSizeBytes: berkasPengajuan.generatedPdfSizeBytes,
    })
    .from(berkasPengajuan)
    .where(eq(berkasPengajuan.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function findBerkasValidasiRowsForUpdate(
  berkasId: string,
  db: BerkasDb = dbOrDefault(),
): Promise<BerkasValidasiRow[]> {
  return db
    .select({
      id: berkasValidasi.id,
      urutan: berkasValidasi.urutan,
      validatorUserId: berkasValidasi.validatorUserId,
      namaSnapshot: berkasValidasi.namaSnapshot,
      jabatanSnapshot: berkasValidasi.jabatanSnapshot,
      ttdPathname: berkasValidasi.ttdPathname,
      ttdMimeType: berkasValidasi.ttdMimeType,
      ttdSizeBytes: berkasValidasi.ttdSizeBytes,
      ttdUploadedAt: berkasValidasi.ttdUploadedAt,
    })
    .from(berkasValidasi)
    .where(eq(berkasValidasi.berkasId, berkasId))
    .orderBy(asc(berkasValidasi.urutan), asc(berkasValidasi.id))
    .for("update");
}

export async function updateBerkasValidasiTtdRow(
  id: string,
  input: {
    ttdPathname: string;
    ttdMimeType: string;
    ttdSizeBytes: number;
    ttdUploadedAt: Date;
  },
  db: BerkasDb = dbOrDefault(),
): Promise<{ id: string } | null> {
  const rows = await db
    .update(berkasValidasi)
    .set({
      ttdPathname: input.ttdPathname,
      ttdMimeType: input.ttdMimeType,
      ttdSizeBytes: input.ttdSizeBytes,
      ttdUploadedAt: input.ttdUploadedAt,
    })
    .where(eq(berkasValidasi.id, id))
    .returning({ id: berkasValidasi.id });
  return rows[0] ?? null;
}

export async function insertBerkasWithChildren(
  input: InsertBerkasInput,
): Promise<string> {
  return getPgDb().transaction(async (tx) => {
    const parentRows = await tx
      .insert(berkasPengajuan)
      .values({
        judul: input.judul,
        kodeSeri: input.kodeSeri,
        pemohonId: input.pemohonId,
        originalPdfPathname: input.originalPdfPathname,
        originalPdfName: input.originalPdfName,
        originalPdfMimeType: input.originalPdfMimeType,
        originalPdfSizeBytes: input.originalPdfSizeBytes,
        originalPdfPageCount: input.originalPdfPageCount,
      })
      .returning({ id: berkasPengajuan.id });

    const parent = parentRows[0];
    if (!parent) {
      throw new Error("Failed to create Berkas");
    }

    await tx.insert(berkasPenyusun).values(
      input.penyusun.map((item) => ({
        berkasId: parent.id,
        userId: item.userId,
        namaSnapshot: item.namaSnapshot,
        jabatanSnapshot: item.jabatanSnapshot,
        urutan: item.urutan,
        ttdPathname: item.ttdPathname,
        ttdMimeType: item.ttdMimeType,
        ttdSizeBytes: item.ttdSizeBytes,
      })),
    );

    await tx.insert(berkasValidasi).values(
      input.validasi.map((item) => ({
        berkasId: parent.id,
        urutan: item.urutan,
        validatorUserId: item.userId,
        namaSnapshot: item.namaSnapshot,
        jabatanSnapshot: item.jabatanSnapshot,
      })),
    );

    return parent.id;
  });
}

export async function findBerkasForUpdate(
  id: string,
  db: BerkasDb = dbOrDefault(),
): Promise<{
  id: string;
  pemohonId: string;
  status: string;
  version: number;
} | null> {
  const rows = await db
    .select({
      id: berkasPengajuan.id,
      pemohonId: berkasPengajuan.pemohonId,
      status: berkasPengajuan.status,
      version: berkasPengajuan.version,
    })
    .from(berkasPengajuan)
    .where(eq(berkasPengajuan.id, id))
    .for("update")
    .limit(1);
  return rows[0] ?? null;
}

export type BerkasDeletionRow = {
  id: string;
  originalPdfPathname: string;
  generatedPdfPathname: string | null;
  penyusunTtdPathnames: string[];
  validasiTtdPathnames: string[];
};

/** Collects every blob pathname owned by one Berkas before it is deleted. */
export async function findBerkasDeletionRowById(
  id: string,
): Promise<BerkasDeletionRow | null> {
  const parentRows = await getPgDb()
    .select({
      id: berkasPengajuan.id,
      originalPdfPathname: berkasPengajuan.originalPdfPathname,
      generatedPdfPathname: berkasPengajuan.generatedPdfPathname,
    })
    .from(berkasPengajuan)
    .where(eq(berkasPengajuan.id, id))
    .limit(1);

  const parent = parentRows[0];
  if (!parent) return null;

  const [penyusun, validasi] = await Promise.all([
    getPgDb()
      .select({ ttdPathname: berkasPenyusun.ttdPathname })
      .from(berkasPenyusun)
      .where(eq(berkasPenyusun.berkasId, id)),
    getPgDb()
      .select({ ttdPathname: berkasValidasi.ttdPathname })
      .from(berkasValidasi)
      .where(eq(berkasValidasi.berkasId, id)),
  ]);

  return {
    ...parent,
    penyusunTtdPathnames: penyusun.map((row) => row.ttdPathname),
    validasiTtdPathnames: validasi
      .map((row) => row.ttdPathname)
      .filter((pathname): pathname is string => Boolean(pathname)),
  };
}

/** Deletes the parent row; berkas_penyusun and berkas_validasi cascade. */
export async function deleteBerkasRow(id: string): Promise<boolean> {
  const rows = await getPgDb()
    .delete(berkasPengajuan)
    .where(eq(berkasPengajuan.id, id))
    .returning({ id: berkasPengajuan.id });
  return rows.length > 0;
}

export async function updateBerkasRejectionRow(
  id: string,
  expectedVersion: number,
  input: {
    rejectionReason: string;
    rejectedAt: Date;
    rejectedBy: string;
  },
  db: BerkasDb = dbOrDefault(),
): Promise<{ id: string; status: string; version: number } | null> {
  const rows = await db
    .update(berkasPengajuan)
    .set({
      status: "DITOLAK",
      rejectionReason: input.rejectionReason,
      rejectedAt: input.rejectedAt,
      rejectedBy: input.rejectedBy,
      version: sql`${berkasPengajuan.version} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(berkasPengajuan.id, id),
        eq(berkasPengajuan.version, expectedVersion),
      ),
    )
    .returning({
      id: berkasPengajuan.id,
      status: berkasPengajuan.status,
      version: berkasPengajuan.version,
    });
  return rows[0] ?? null;
}

export async function updateBerkasRevisionRow(
  id: string,
  expectedVersion: number,
  input: {
    originalPdfPathname: string;
    originalPdfName: string;
    originalPdfMimeType: string;
    originalPdfSizeBytes: number;
    originalPdfPageCount: number;
  },
  db: BerkasDb = dbOrDefault(),
): Promise<{ id: string; status: string; version: number } | null> {
  const rows = await db
    .update(berkasPengajuan)
    .set({
      ...input,
      status: "MENUNGGU_TTD_1",
      catatan: null,
      completedAt: null,
      generatedPdfPathname: null,
      generatedPdfSizeBytes: null,
      revisionCount: sql`${berkasPengajuan.revisionCount} + 1`,
      version: sql`${berkasPengajuan.version} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(berkasPengajuan.id, id),
        eq(berkasPengajuan.version, expectedVersion),
      ),
    )
    .returning({
      id: berkasPengajuan.id,
      status: berkasPengajuan.status,
      version: berkasPengajuan.version,
    });
  return rows[0] ?? null;
}

export async function clearBerkasValidasiTtdRows(
  berkasId: string,
  db: BerkasDb = dbOrDefault(),
): Promise<void> {
  await db
    .update(berkasValidasi)
    .set({
      ttdPathname: null,
      ttdMimeType: null,
      ttdSizeBytes: null,
      ttdUploadedAt: null,
    })
    .where(eq(berkasValidasi.berkasId, berkasId));
}

export async function updateBerkasStatusRow(
  id: string,
  expectedVersion: number,
  patch: BerkasStatusPatch,
  db: BerkasDb = dbOrDefault(),
): Promise<{
  id: string;
  status: string;
  version: number;
  completedAt: Date | null;
} | null> {
  const rows = await db
    .update(berkasPengajuan)
    .set({
      ...patch,
      version: sql`${berkasPengajuan.version} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(berkasPengajuan.id, id),
        eq(berkasPengajuan.version, expectedVersion),
      ),
    )
    .returning({
      id: berkasPengajuan.id,
      status: berkasPengajuan.status,
      version: berkasPengajuan.version,
      completedAt: berkasPengajuan.completedAt,
    });
  return rows[0] ?? null;
}
