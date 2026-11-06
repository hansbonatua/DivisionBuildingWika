import { getPgDb } from "@/lib/pg/client";
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from "@/lib/pg/errors";
import {
  canDeleteMetodeKerja,
  canManageMetodeKerja,
  canViewMetodeKerja,
  isEligibleMetodeKerjaPic,
  MetodeKerjaForbiddenError,
} from "@/lib/metode-kerja-standar/access";
import {
  DISIPLIN_LIST,
  getDisiplinByCode,
  getDisiplinBySlug,
  type DisiplinCode,
} from "@/lib/metode-kerja-standar/constants";
import {
  countItemsInSubKategori,
  deleteItem as deleteItemRow,
  deleteSubKategori as deleteSubKategoriRow,
  findItemById,
  findSubKategoriById,
  insertItem as insertItemRow,
  insertSubKategori as insertSubKategoriRow,
  listAllItemRows,
  listAllSubKategoriRows,
  listDisiplinCounts,
  listItemsForSubKategoriIds,
  listPicOptions as listPicOptionRows,
  listPicsForItemIds,
  listPicsForSubKategoriIds,
  listReorderItemIds,
  listReorderSubKategoriIds,
  listSubKategoriRows,
  listUsersByIds,
  nextItemSortOrder,
  nextSubKategoriSortOrder,
  replacePics,
  updateItem as updateItemRow,
  updateSortOrders,
  updateSubKategori as updateSubKategoriRow,
  type MetodeKerjaItemRow,
  type MetodeKerjaPicRow,
  type MetodeKerjaSubKategoriRow,
} from "@/lib/metode-kerja-standar/repository";
import {
  isSafeMetodeKerjaUrl,
  type CreateItemInput,
  type CreateSubKategoriInput,
  type ReorderInput,
  type UpdateItemInput,
  type UpdateSubKategoriInput,
} from "@/lib/metode-kerja-standar/schema";
import {
  buildMetodeKerjaSummary,
  type SummaryPic,
  type SummaryRow,
  type SummarySubKategoriInput,
} from "@/lib/metode-kerja-standar/summary";

export type MetodeKerjaActor = {
  id: string;
  role: string;
  status: string;
};

export type MetodeKerjaPicDto = {
  user_id: string;
  name: string;
  status: string;
  position: string;
};

export type MetodeKerjaUserRef = {
  user_id: string;
  name: string;
};

export type MetodeKerjaAuditDto = {
  created_by: MetodeKerjaUserRef;
  created_at: string;
  updated_by: MetodeKerjaUserRef | null;
  updated_at: string;
};

export type MetodeKerjaItemDto = MetodeKerjaAuditDto & {
  id: string;
  kode: string;
  nama: string;
  sort_order: number;
  evidence_url: string | null;
  note: string | null;
  pics: MetodeKerjaPicDto[];
};

export type MetodeKerjaSubKategoriDto = MetodeKerjaAuditDto & {
  id: string;
  disiplin: DisiplinCode;
  kode: string;
  nama: string;
  sort_order: number;
  evidence_url: string | null;
  note: string | null;
  pics: MetodeKerjaPicDto[];
  items: MetodeKerjaItemDto[];
};

export type MetodeKerjaDisiplinDetailDto = {
  disiplin: { code: DisiplinCode; slug: string; name: string };
  sub_kategori: MetodeKerjaSubKategoriDto[];
};

export type MetodeKerjaDisiplinListItem = {
  code: DisiplinCode;
  slug: string;
  name: string;
  sort_order: number;
  sub_kategori_count: number;
  item_count: number;
};

export type MetodeKerjaPicOption = {
  user_id: string;
  name: string;
  status: string;
  position: string;
};

export class MetodeKerjaNotFoundError extends Error {
  constructor(message = "Data Metode Kerja Standar tidak ditemukan") {
    super(message);
    this.name = "MetodeKerjaNotFoundError";
  }
}

export class MetodeKerjaConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetodeKerjaConflictError";
  }
}

export class MetodeKerjaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetodeKerjaValidationError";
  }
}

function assertActive(actor: MetodeKerjaActor): void {
  if (actor.status !== "active") {
    throw new MetodeKerjaForbiddenError();
  }
}

function assertViewActor(actor: MetodeKerjaActor): void {
  assertActive(actor);
  if (!canViewMetodeKerja(actor.role)) {
    throw new MetodeKerjaForbiddenError();
  }
}

function assertManageActor(actor: MetodeKerjaActor): void {
  assertActive(actor);
  if (!canManageMetodeKerja(actor.role)) {
    throw new MetodeKerjaForbiddenError();
  }
}

function assertDeleteActor(actor: MetodeKerjaActor): void {
  assertActive(actor);
  if (!canDeleteMetodeKerja(actor.role)) {
    throw new MetodeKerjaForbiddenError();
  }
}

function normalizeKode(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (normalized.length === 0 || normalized.length > 30) {
    throw new MetodeKerjaValidationError("Kode harus 1–30 karakter");
  }
  return normalized;
}

function normalizeNama(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 200) {
    throw new MetodeKerjaValidationError("Nama harus 1–200 karakter");
  }
  return normalized;
}

function normalizeNote(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  if (normalized.length > 2000) {
    throw new MetodeKerjaValidationError("Catatan maksimal 2.000 karakter");
  }
  return normalized.length > 0 ? normalized : null;
}

function normalizeEvidenceUrl(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  if (normalized.length === 0) {
    return null;
  }
  if (normalized.length > 2048 || !isSafeMetodeKerjaUrl(normalized)) {
    throw new MetodeKerjaValidationError(
      "URL evidence harus diawali http:// atau https://",
    );
  }
  return normalized;
}

function toPic(row: MetodeKerjaPicRow): MetodeKerjaPicDto {
  return {
    user_id: row.userId,
    name: row.name,
    status: row.status,
    position: row.position,
  };
}

function toSummaryPic(row: MetodeKerjaPicRow): SummaryPic {
  return {
    user_id: row.userId,
    name: row.name,
    status: row.status,
    position: row.position,
  };
}

function userRef(
  id: string,
  usersById: ReadonlyMap<string, { id: string; name: string }>,
): MetodeKerjaUserRef {
  const user = usersById.get(id);
  return { user_id: id, name: user?.name ?? "—" };
}

function auditFields(
  row: MetodeKerjaSubKategoriRow | MetodeKerjaItemRow,
  usersById: ReadonlyMap<string, { id: string; name: string }>,
): MetodeKerjaAuditDto {
  return {
    created_by: userRef(row.createdById, usersById),
    created_at: row.createdAt.toISOString(),
    updated_by: row.updatedById
      ? userRef(row.updatedById, usersById)
      : null,
    updated_at: row.updatedAt.toISOString(),
  };
}

function groupPicsBySubKategori(
  rows: readonly MetodeKerjaPicRow[],
): Map<string, MetodeKerjaPicDto[]> {
  const result = new Map<string, MetodeKerjaPicDto[]>();
  for (const row of rows) {
    if (!row.subKategoriId) continue;
    const list = result.get(row.subKategoriId) ?? [];
    list.push(toPic(row));
    result.set(row.subKategoriId, list);
  }
  return result;
}

function groupPicsByItem(
  rows: readonly MetodeKerjaPicRow[],
): Map<string, MetodeKerjaPicDto[]> {
  const result = new Map<string, MetodeKerjaPicDto[]>();
  for (const row of rows) {
    if (!row.itemId) continue;
    const list = result.get(row.itemId) ?? [];
    list.push(toPic(row));
    result.set(row.itemId, list);
  }
  return result;
}

function groupItemsBySubKategori(
  rows: readonly MetodeKerjaItemRow[],
): Map<string, MetodeKerjaItemRow[]> {
  const result = new Map<string, MetodeKerjaItemRow[]>();
  for (const row of rows) {
    const list = result.get(row.subKategoriId) ?? [];
    list.push(row);
    result.set(row.subKategoriId, list);
  }
  return result;
}

function authorizePicIds(
  picIds: readonly string[],
  requireOne: boolean,
): string[] {
  const unique = [...new Set(picIds.map((id) => id.trim()).filter(Boolean))];
  if (requireOne && unique.length === 0) {
    throw new MetodeKerjaValidationError("Item wajib memiliki minimal 1 PIC");
  }
  if (!requireOne && unique.length === 0) {
    return [];
  }
  return unique;
}

async function validatePicIds(
  picIds: readonly string[],
  requireOne: boolean,
): Promise<string[]> {
  const unique = authorizePicIds(picIds, requireOne);
  if (unique.length === 0) {
    return [];
  }

  const users = await listUsersByIds(unique);
  if (users.length !== unique.length) {
    throw new MetodeKerjaNotFoundError("PIC user tidak ditemukan");
  }
  const byId = new Map(users.map((user) => [user.id, user]));
  for (const id of unique) {
    const user = byId.get(id);
    if (!user || !isEligibleMetodeKerjaPic(user)) {
      throw new MetodeKerjaValidationError("PIC harus user dengan role Head Office");
    }
  }
  return unique;
}

async function loadDisiplinDetail(
  code: DisiplinCode,
): Promise<MetodeKerjaDisiplinDetailDto> {
  const disiplin = getDisiplinByCode(code);
  if (!disiplin) {
    throw new MetodeKerjaNotFoundError("Disiplin tidak ditemukan");
  }

  const subRows = await listSubKategoriRows(code);
  const subIds = subRows.map((row) => row.id);
  const itemRows = await listItemsForSubKategoriIds(subIds);
  const itemIds = itemRows.map((row) => row.id);

  const [subPics, itemPics] = await Promise.all([
    listPicsForSubKategoriIds(subIds),
    listPicsForItemIds(itemIds),
  ]);

  const authorIds = [
    ...new Set(
      [...subRows, ...itemRows].flatMap((row) =>
        [row.createdById, row.updatedById].filter(
          (id): id is string => id !== null,
        ),
      ),
    ),
  ];
  const authors = await listUsersByIds(authorIds);
  const usersById = new Map(authors.map((user) => [user.id, user]));
  const subPicsBy = groupPicsBySubKategori(subPics);
  const itemPicsBy = groupPicsByItem(itemPics);
  const itemsBySub = groupItemsBySubKategori(itemRows);

  return {
    disiplin: { code: disiplin.code, slug: disiplin.slug, name: disiplin.name },
    sub_kategori: subRows.map((row) => ({
      ...auditFields(row, usersById),
      id: row.id,
      disiplin: row.disiplin as DisiplinCode,
      kode: row.kode,
      nama: row.nama,
      sort_order: row.sortOrder,
      evidence_url: row.evidenceUrl,
      note: row.note,
      pics: subPicsBy.get(row.id) ?? [],
      items: (itemsBySub.get(row.id) ?? []).map((item) => ({
        ...auditFields(item, usersById),
        id: item.id,
        kode: item.kode,
        nama: item.nama,
        sort_order: item.sortOrder,
        evidence_url: item.evidenceUrl,
        note: item.note,
        pics: itemPicsBy.get(item.id) ?? [],
      })),
    })),
  };
}

function hasSqlState(error: unknown, code: string, depth = 0): boolean {
  if (depth > 3 || typeof error !== "object" || error === null) {
    return false;
  }
  const state = (error as { code?: unknown }).code;
  if (state === code) {
    return true;
  }
  const cause = (error as { cause?: unknown }).cause;
  return cause === error ? false : hasSqlState(cause, code, depth + 1);
}

function mapWriteError(error: unknown): never {
  if (
    error instanceof MetodeKerjaForbiddenError ||
    error instanceof MetodeKerjaNotFoundError ||
    error instanceof MetodeKerjaConflictError ||
    error instanceof MetodeKerjaValidationError
  ) {
    throw error;
  }
  if (isUniqueViolation(error)) {
    throw new MetodeKerjaConflictError(
      "Kode sudah digunakan pada parent ini. Muat ulang data terbaru.",
    );
  }
  if (isForeignKeyViolation(error)) {
    throw new MetodeKerjaConflictError(
      "Data terkait sudah tidak tersedia. Muat ulang data terbaru.",
    );
  }
  if (hasSqlState(error, "23514")) {
    throw new MetodeKerjaValidationError(
      "Data Metode Kerja Standar tidak memenuhi aturan database.",
    );
  }
  throw error;
}

export async function listDisiplin(
  actor: MetodeKerjaActor,
): Promise<MetodeKerjaDisiplinListItem[]> {
  assertViewActor(actor);
  const counts = await listDisiplinCounts();
  const byCode = new Map(counts.map((row) => [row.disiplin, row]));
  return DISIPLIN_LIST.map((disiplin) => {
    const count = byCode.get(disiplin.code);
    return {
      code: disiplin.code,
      slug: disiplin.slug,
      name: disiplin.name,
      sort_order: disiplin.sortOrder,
      sub_kategori_count: count?.subKategoriCount ?? 0,
      item_count: count?.itemCount ?? 0,
    };
  });
}

export async function getDisiplinDetail(
  actor: MetodeKerjaActor,
  code: string,
): Promise<MetodeKerjaDisiplinDetailDto> {
  assertViewActor(actor);
  const disiplin = getDisiplinByCode(code);
  if (!disiplin) {
    throw new MetodeKerjaNotFoundError("Disiplin tidak ditemukan");
  }
  return loadDisiplinDetail(disiplin.code);
}

export async function getDisiplinDetailBySlug(
  actor: MetodeKerjaActor,
  slug: string,
): Promise<MetodeKerjaDisiplinDetailDto> {
  assertViewActor(actor);
  const disiplin = getDisiplinBySlug(slug);
  if (!disiplin) {
    throw new MetodeKerjaNotFoundError("Disiplin tidak ditemukan");
  }
  return loadDisiplinDetail(disiplin.code);
}

export async function createSubKategori(
  actor: MetodeKerjaActor,
  code: string,
  input: CreateSubKategoriInput,
): Promise<MetodeKerjaSubKategoriDto> {
  assertManageActor(actor);
  const disiplin = getDisiplinByCode(code);
  if (!disiplin) {
    throw new MetodeKerjaNotFoundError("Disiplin tidak ditemukan");
  }

  const picIds = await validatePicIds(input.pic_ids ?? [], false);
  const db = getPgDb();
  let id: string;
  try {
    id = await db.transaction(async (tx) => {
      const sortOrder = await nextSubKategoriSortOrder(disiplin.code, tx);
      const createdId = await insertSubKategoriRow(
        {
          disiplin: disiplin.code,
          kode: normalizeKode(input.kode),
          nama: normalizeNama(input.nama),
          sortOrder,
          evidenceUrl: normalizeEvidenceUrl(input.evidence_url),
          note: normalizeNote(input.note),
          createdBy: actor.id,
        },
        tx,
      );
      await replacePics({ subKategoriId: createdId }, picIds, tx);
      return createdId;
    });
  } catch (error) {
    mapWriteError(error);
  }

  const detail = await loadDisiplinDetail(disiplin.code);
  const created = detail.sub_kategori.find((row) => row.id === id);
  if (!created) {
    throw new MetodeKerjaNotFoundError();
  }
  return created;
}

export async function updateSubKategori(
  actor: MetodeKerjaActor,
  id: string,
  input: UpdateSubKategoriInput,
): Promise<MetodeKerjaSubKategoriDto> {
  assertManageActor(actor);
  const current = await findSubKategoriById(id);
  if (!current) {
    throw new MetodeKerjaNotFoundError();
  }
  const picIds = await validatePicIds(input.pic_ids, false);
  const db = getPgDb();
  try {
    await db.transaction(async (tx) => {
      const updated = await updateSubKategoriRow(
        id,
        {
          kode: normalizeKode(input.kode),
          nama: normalizeNama(input.nama),
          evidenceUrl: normalizeEvidenceUrl(input.evidence_url),
          note: normalizeNote(input.note),
          updatedBy: actor.id,
        },
        tx,
      );
      if (!updated) {
        throw new MetodeKerjaNotFoundError();
      }
      await replacePics({ subKategoriId: id }, picIds, tx);
    });
  } catch (error) {
    mapWriteError(error);
  }

  const detail = await loadDisiplinDetail(current.disiplin as DisiplinCode);
  const updated = detail.sub_kategori.find((row) => row.id === id);
  if (!updated) {
    throw new MetodeKerjaNotFoundError();
  }
  return updated;
}

export async function deleteSubKategori(
  actor: MetodeKerjaActor,
  id: string,
): Promise<{ deleted: true; id: string }> {
  assertDeleteActor(actor);
  const current = await findSubKategoriById(id);
  if (!current) {
    throw new MetodeKerjaNotFoundError();
  }
  const childCount = await countItemsInSubKategori(id);
  if (childCount > 0) {
    throw new MetodeKerjaConflictError(
      "Sub-kategori masih memiliki item dan tidak dapat dihapus.",
    );
  }
  try {
    const deleted = await deleteSubKategoriRow(id);
    if (!deleted) {
      throw new MetodeKerjaNotFoundError();
    }
  } catch (error) {
    mapWriteError(error);
  }
  return { deleted: true, id };
}

export async function createItem(
  actor: MetodeKerjaActor,
  subKategoriId: string,
  input: CreateItemInput,
): Promise<MetodeKerjaItemDto> {
  assertManageActor(actor);
  const sub = await findSubKategoriById(subKategoriId);
  if (!sub) {
    throw new MetodeKerjaNotFoundError("Sub-kategori tidak ditemukan");
  }
  const picIds = await validatePicIds(input.pic_ids, true);
  const db = getPgDb();
  let id: string;
  try {
    id = await db.transaction(async (tx) => {
      const sortOrder = await nextItemSortOrder(subKategoriId, tx);
      const createdId = await insertItemRow(
        {
          subKategoriId,
          kode: normalizeKode(input.kode),
          nama: normalizeNama(input.nama),
          sortOrder,
          evidenceUrl: normalizeEvidenceUrl(input.evidence_url),
          note: normalizeNote(input.note),
          createdBy: actor.id,
        },
        tx,
      );
      await replacePics({ itemId: createdId }, picIds, tx);
      return createdId;
    });
  } catch (error) {
    mapWriteError(error);
  }

  const detail = await loadDisiplinDetail(sub.disiplin as DisiplinCode);
  const created = detail.sub_kategori.flatMap((row) => row.items).find((row) => row.id === id);
  if (!created) {
    throw new MetodeKerjaNotFoundError();
  }
  return created;
}

export async function updateItem(
  actor: MetodeKerjaActor,
  id: string,
  input: UpdateItemInput,
): Promise<MetodeKerjaItemDto> {
  assertManageActor(actor);
  const current = await findItemById(id);
  if (!current) {
    throw new MetodeKerjaNotFoundError();
  }
  const picIds = await validatePicIds(input.pic_ids, true);
  const db = getPgDb();
  try {
    await db.transaction(async (tx) => {
      const updated = await updateItemRow(
        id,
        {
          kode: normalizeKode(input.kode),
          nama: normalizeNama(input.nama),
          evidenceUrl: normalizeEvidenceUrl(input.evidence_url),
          note: normalizeNote(input.note),
          updatedBy: actor.id,
        },
        tx,
      );
      if (!updated) {
        throw new MetodeKerjaNotFoundError();
      }
      await replacePics({ itemId: id }, picIds, tx);
    });
  } catch (error) {
    mapWriteError(error);
  }

  const sub = await findSubKategoriById(current.subKategoriId);
  if (!sub) {
    throw new MetodeKerjaNotFoundError();
  }
  const detail = await loadDisiplinDetail(sub.disiplin as DisiplinCode);
  const updated = detail.sub_kategori.flatMap((row) => row.items).find((row) => row.id === id);
  if (!updated) {
    throw new MetodeKerjaNotFoundError();
  }
  return updated;
}

export async function deleteItem(
  actor: MetodeKerjaActor,
  id: string,
): Promise<{ deleted: true; id: string }> {
  assertDeleteActor(actor);
  try {
    const deleted = await deleteItemRow(id);
    if (!deleted) {
      throw new MetodeKerjaNotFoundError();
    }
  } catch (error) {
    mapWriteError(error);
  }
  return { deleted: true, id };
}

export function isCompleteReorder(
  currentIds: readonly string[],
  orderedIds: readonly string[],
): boolean {
  if (currentIds.length !== orderedIds.length) {
    return false;
  }
  if (new Set(orderedIds).size !== orderedIds.length) {
    return false;
  }
  const current = new Set(currentIds);
  return orderedIds.every((id) => current.has(id));
}

export async function reorder(
  actor: MetodeKerjaActor,
  input: ReorderInput,
): Promise<{ entity: "sub_kategori" | "item"; parent_id: string; ordered_ids: string[] }> {
  assertManageActor(actor);

  let currentIds: string[];
  let parentId = input.parent_id;
  if (input.entity === "sub_kategori") {
    const disiplin = getDisiplinByCode(input.parent_id);
    if (!disiplin) {
      throw new MetodeKerjaNotFoundError("Disiplin tidak ditemukan");
    }
    parentId = disiplin.code;
    currentIds = await listReorderSubKategoriIds(disiplin.code);
  } else {
    const sub = await findSubKategoriById(input.parent_id);
    if (!sub) {
      throw new MetodeKerjaNotFoundError("Sub-kategori tidak ditemukan");
    }
    currentIds = await listReorderItemIds(input.parent_id);
  }

  if (!isCompleteReorder(currentIds, input.ordered_ids)) {
    throw new MetodeKerjaConflictError(
      "Daftar reorder harus memuat seluruh child parent tanpa duplikat. Muat ulang data terbaru.",
    );
  }

  const db = getPgDb();
  try {
    await db.transaction(async (tx) => {
      await updateSortOrders(input.entity, input.ordered_ids, actor.id, tx);
    });
  } catch (error) {
    mapWriteError(error);
  }

  return { entity: input.entity, parent_id: parentId, ordered_ids: [...input.ordered_ids] };
}

export async function listPicOptions(
  actor: MetodeKerjaActor,
): Promise<MetodeKerjaPicOption[]> {
  assertManageActor(actor);
  const rows = await listPicOptionRows();
  return rows.map((row) => ({
    user_id: row.id,
    name: row.name,
    status: row.status,
    position: row.position,
  }));
}

export async function getSummary(
  actor: MetodeKerjaActor,
): Promise<{ rows: SummaryRow[] }> {
  assertViewActor(actor);

  const subRows = await listAllSubKategoriRows();
  const subIds = subRows.map((row) => row.id);
  const itemRows = await listAllItemRows();
  const itemIds = itemRows.map((row) => row.id);

  const [subPics, itemPics] = await Promise.all([
    listPicsForSubKategoriIds(subIds),
    listPicsForItemIds(itemIds),
  ]);

  const subPicsBy = new Map<string, SummaryPic[]>();
  for (const row of subPics) {
    if (!row.subKategoriId) continue;
    const list = subPicsBy.get(row.subKategoriId) ?? [];
    list.push(toSummaryPic(row));
    subPicsBy.set(row.subKategoriId, list);
  }

  const itemPicsBy = new Map<string, SummaryPic[]>();
  for (const row of itemPics) {
    if (!row.itemId) continue;
    const list = itemPicsBy.get(row.itemId) ?? [];
    list.push(toSummaryPic(row));
    itemPicsBy.set(row.itemId, list);
  }

  const itemsBySub = groupItemsBySubKategori(itemRows);
  const inputs: SummarySubKategoriInput[] = subRows.map((row) => ({
    id: row.id,
    disiplin: row.disiplin as DisiplinCode,
    kode: row.kode,
    nama: row.nama,
    evidenceUrl: row.evidenceUrl,
    updatedAt: row.updatedAt.toISOString(),
    pics: subPicsBy.get(row.id) ?? [],
    items: (itemsBySub.get(row.id) ?? []).map((item) => ({
      id: item.id,
      kode: item.kode,
      nama: item.nama,
      evidenceUrl: item.evidenceUrl,
      updatedAt: item.updatedAt.toISOString(),
      pics: itemPicsBy.get(item.id) ?? [],
    })),
  }));

  return { rows: buildMetodeKerjaSummary(inputs) };
}
