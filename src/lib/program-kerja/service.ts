import { getPgDb } from "@/lib/pg/client";
import { HEAD_OFFICE_ROLE } from "@/lib/users/roles";
import {
  canManageProgramKerja,
  canUpdateProgramEvidence,
  canUpdateProgramNote,
  canUpdateProgramRi,
} from "@/lib/program-kerja/access";
import {
  deleteProgram as deleteProgramRow,
  findGroupById,
  findMonthlyRows,
  findPicUserIds,
  findProgramById,
  findRiMonthRange,
  findUsersByIds,
  hasAnyRi,
  insertMonthlyRows,
  insertProgram,
  isUserAssignedPic,
  listProgramRows,
  replacePics,
  updateMonthlyRa,
  updateMonthlyRi,
  updateProgram as updateProgramRow,
  updateProgramEvidence as updateProgramEvidenceRow,
  updateProgramNote as updateProgramNoteRow,
  type ProgramKerjaMonthlyDto,
} from "@/lib/program-kerja/repository";
import type { NewPgProgramKerja, PgProgramKerja } from "@/lib/pg/schema";
import type {
  CreateProgramKerjaInput,
  UpdateProgramEvidenceInput,
  UpdateProgramMasterInput,
  UpdateProgramNoteInput,
  UpdateProgramRiInput,
} from "@/lib/program-kerja/schema";

// Server-only business rules for Kelola Program Kerja. Routes must never
// bypass this layer. Suggested HTTP mapping for later route handlers:
// Forbidden → 403, NotFound → 404, Conflict → 409, Validation → 400.

export type ProgramKerjaActor = {
  id: string;
  role: string;
  status: string;
};

export type ProgramKerjaDetail = {
  program: PgProgramKerja;
  monthly: ProgramKerjaMonthlyDto[];
  picUserIds: string[];
};

// Enriched Kelola list item: master fields (unchanged, backward
// compatible) plus group display data, monthly rows and PIC display data.
// No password hashes, emails, roles, phones or sessions — PICs expose
// id + name only.
export type ProgramKerjaListItem = {
  id: string;
  groupId: string;
  group: { id: string; name: string } | null;
  year: number;
  name: string;
  description: string;
  startMonth: number;
  endMonth: number;
  parameter: string;
  unit: string;
  monitor: string | null;
  note: string | null;
  evidenceUrl: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  monthly: Array<{ month: number; raValue: number; riValue: number | null }>;
  pics: Array<{ id: string; name: string }>;
};

export class ProgramKerjaForbiddenError extends Error {
  constructor(message = "Akses Program Kerja ditolak") {
    super(message);
    this.name = "ProgramKerjaForbiddenError";
  }
}

export class ProgramKerjaNotFoundError extends Error {
  constructor(message = "Program Kerja tidak ditemukan") {
    super(message);
    this.name = "ProgramKerjaNotFoundError";
  }
}

export class ProgramKerjaConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProgramKerjaConflictError";
  }
}

export class ProgramKerjaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProgramKerjaValidationError";
  }
}

function assertActive(actor: ProgramKerjaActor): void {
  if (actor.status !== "active") {
    throw new ProgramKerjaForbiddenError();
  }
}

function assertManageAccess(actor: ProgramKerjaActor): void {
  assertActive(actor);
  if (!canManageProgramKerja(actor.role)) {
    throw new ProgramKerjaForbiddenError();
  }
}

function assertNoteAccess(actor: ProgramKerjaActor): void {
  assertActive(actor);
  if (!canUpdateProgramNote(actor.role)) {
    throw new ProgramKerjaForbiddenError();
  }
}

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new ProgramKerjaValidationError(`${label} harus angka yang valid`);
  }
}

async function getProgramOrThrow(id: string): Promise<PgProgramKerja> {
  const program = await findProgramById(id);
  if (!program) {
    throw new ProgramKerjaNotFoundError();
  }
  return program;
}

async function getDetail(id: string): Promise<ProgramKerjaDetail> {
  const program = await getProgramOrThrow(id);
  const [monthly, picUserIds] = await Promise.all([findMonthlyRows(id), findPicUserIds(id)]);
  return { program, monthly, picUserIds };
}

// Validates PIC candidates: non-empty after trim/dedupe, all existing,
// every one exactly Head Office. Returns the deduplicated id list.
async function validatePicIds(picIds: string[]): Promise<string[]> {
  const unique = [...new Set(picIds.map((id) => id.trim()).filter((id) => id.length > 0))];
  if (unique.length === 0) {
    throw new ProgramKerjaValidationError("Minimal 1 PIC");
  }
  const users = await findUsersByIds(unique);
  if (users.length !== unique.length) {
    throw new ProgramKerjaNotFoundError("PIC user tidak ditemukan");
  }
  for (const user of users) {
    if (user.role !== HEAD_OFFICE_ROLE) {
      throw new ProgramKerjaConflictError("PIC harus user dengan role Head Office");
    }
  }
  return unique;
}

function buildCreateMonthlyRa(
  input: CreateProgramKerjaInput,
): Array<{ month: number; raValue: number }> {
  if (input.unit === "Persentase") {
    assertFiniteNumber(input.raPercentage, "RA");
    return Array.from({ length: 12 }, (_, index) => ({ month: index + 1, raValue: input.raPercentage }));
  }
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const inPeriod = month >= input.startMonth && month <= input.endMonth;
    // Never trust client outside-period values — force 0.
    const raValue = inPeriod ? input.monthlyRa[month - 1] ?? 0 : 0;
    assertFiniteNumber(raValue, "RA");
    return { month, raValue };
  });
}

export async function listPrograms(actor: ProgramKerjaActor): Promise<ProgramKerjaListItem[]> {
  assertManageAccess(actor);
  const rows = await listProgramRows();
  return rows.map((row) => ({
    id: row.program.id,
    groupId: row.program.groupId,
    group: row.group,
    year: row.program.year,
    name: row.program.name,
    description: row.program.description,
    startMonth: row.program.startMonth,
    endMonth: row.program.endMonth,
    parameter: row.program.parameter,
    unit: row.program.unit,
    monitor: row.program.monitor,
    note: row.program.note,
    evidenceUrl: row.program.evidenceUrl,
    createdBy: row.program.createdBy,
    createdAt: row.program.createdAt,
    updatedAt: row.program.updatedAt,
    monthly: row.monthly.map((month) => ({
      month: month.month,
      raValue: month.raValue,
      riValue: month.riValue,
    })),
    pics: row.pics,
  }));
}

export async function getProgramDetail(
  actor: ProgramKerjaActor,
  id: string,
): Promise<ProgramKerjaDetail> {
  assertManageAccess(actor);
  return getDetail(id);
}

export async function createProgram(
  actor: ProgramKerjaActor,
  input: CreateProgramKerjaInput,
): Promise<ProgramKerjaDetail> {
  assertManageAccess(actor);
  if (input.startMonth > input.endMonth) {
    throw new ProgramKerjaValidationError("Bulan mulai tidak boleh setelah bulan selesai");
  }
  const group = await findGroupById(input.groupId);
  if (!group) {
    throw new ProgramKerjaNotFoundError("Kelompok Program Kerja tidak ditemukan");
  }
  const picIds = await validatePicIds(input.picIds);
  const monthlyRa = buildCreateMonthlyRa(input);

  const db = getPgDb();
  const programId = await db.transaction(async (tx) => {
    const program = await insertProgram(
      {
        groupId: input.groupId,
        year: input.year,
        name: input.name,
        description: input.description,
        startMonth: input.startMonth,
        endMonth: input.endMonth,
        parameter: input.parameter,
        unit: input.unit,
        monitor: input.monitor ?? null,
        createdBy: actor.id,
      },
      tx,
    );
    await insertMonthlyRows(
      monthlyRa.map((row) => ({
        programKerjaId: program.id,
        month: row.month,
        raValue: String(row.raValue),
      })),
      tx,
    );
    await replacePics(program.id, picIds, tx);
    return program.id;
  });
  return getDetail(programId);
}

export async function updateProgramMaster(
  actor: ProgramKerjaActor,
  id: string,
  input: UpdateProgramMasterInput,
): Promise<ProgramKerjaDetail> {
  assertManageAccess(actor);
  const program = await getProgramOrThrow(id);

  if (input.groupId !== undefined) {
    const group = await findGroupById(input.groupId);
    if (!group) {
      throw new ProgramKerjaNotFoundError("Kelompok Program Kerja tidak ditemukan");
    }
  }

  const newUnit = input.unit ?? program.unit;
  const newStart = input.startMonth ?? program.startMonth;
  const newEnd = input.endMonth ?? program.endMonth;
  if (newStart > newEnd) {
    throw new ProgramKerjaValidationError("Bulan mulai tidak boleh setelah bulan selesai");
  }

  const unitChanged = newUnit !== program.unit;
  const hasRi = await hasAnyRi(id);
  if (unitChanged && hasRi) {
    throw new ProgramKerjaConflictError(
      "Unit tidak dapat diubah karena Program Kerja sudah memiliki data RI.",
    );
  }
  if (hasRi) {
    const range = await findRiMonthRange(id);
    if (range && (newStart > range.minMonth || newEnd < range.maxMonth)) {
      throw new ProgramKerjaConflictError(
        "Periode baru harus tetap mencakup semua bulan yang memiliki RI.",
      );
    }
  }

  // RA source is required when the unit changes; otherwise existing values
  // carry over (re-normalized against the new period for Jumlah).
  let raSource: Array<{ month: number; raValue: number }> | null = null;
  if (newUnit === "Persentase") {
    if (input.raPercentage !== undefined) {
      assertFiniteNumber(input.raPercentage, "RA");
      raSource = Array.from({ length: 12 }, (_, index) => ({
        month: index + 1,
        raValue: input.raPercentage as number,
      }));
    } else if (unitChanged) {
      throw new ProgramKerjaValidationError("RA wajib diisi saat mengubah unit");
    }
  } else {
    if (input.monthlyRa !== undefined) {
      raSource = Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const raValue = month >= newStart && month <= newEnd ? (input.monthlyRa?.[month - 1] ?? 0) : 0;
        assertFiniteNumber(raValue, "RA");
        return { month, raValue };
      });
    } else if (unitChanged) {
      throw new ProgramKerjaValidationError("RA wajib diisi saat mengubah unit");
    }
  }

  const picIds = input.picIds !== undefined ? await validatePicIds(input.picIds) : null;

  const db = getPgDb();
  await db.transaction(async (tx) => {
    const masterPatch: Partial<NewPgProgramKerja> = {};
    if (input.groupId !== undefined) masterPatch.groupId = input.groupId;
    if (input.name !== undefined) masterPatch.name = input.name;
    if (input.description !== undefined) masterPatch.description = input.description;
    if (input.startMonth !== undefined) masterPatch.startMonth = input.startMonth;
    if (input.endMonth !== undefined) masterPatch.endMonth = input.endMonth;
    if (input.parameter !== undefined) masterPatch.parameter = input.parameter;
    if (input.unit !== undefined) masterPatch.unit = input.unit;
    if (input.monitor !== undefined) masterPatch.monitor = input.monitor;
    if (Object.keys(masterPatch).length > 0) {
      await updateProgramRow(id, masterPatch, tx);
    }
    if (raSource) {
      for (const row of raSource) {
        await updateMonthlyRa(id, row.month, row.raValue, tx);
      }
    } else if (newUnit === "Jumlah" && (input.startMonth !== undefined || input.endMonth !== undefined)) {
      // Period moved without fresh RA: keep in-period values, force
      // newly-outside months to 0. RI columns are never touched.
      const existing = await findMonthlyRows(id, tx);
      for (const row of existing) {
        const inPeriod = row.month >= newStart && row.month <= newEnd;
        if (!inPeriod && row.raValue !== 0) {
          await updateMonthlyRa(id, row.month, 0, tx);
        }
      }
    }
    if (picIds) {
      await replacePics(id, picIds, tx);
    }
  });
  return getDetail(id);
}

export async function updateProgramRi(
  actor: ProgramKerjaActor,
  id: string,
  input: UpdateProgramRiInput,
): Promise<ProgramKerjaMonthlyDto> {
  assertActive(actor);
  assertFiniteNumber(input.ri, "RI");
  await getProgramOrThrow(id);
  // Record-level rule: Head Office AND assigned PIC. Admin without
  // assignment and Head Office without assignment are both denied.
  const assigned = await isUserAssignedPic(id, actor.id);
  if (!canUpdateProgramRi(actor.role, assigned)) {
    throw new ProgramKerjaForbiddenError("Hanya PIC yang ditugaskan dapat mengubah RI");
  }
  const updated = await updateMonthlyRi(id, input.month, input.ri, actor.id);
  if (!updated) {
    throw new ProgramKerjaNotFoundError("Baris bulanan tidak ditemukan");
  }
  return updated;
}

export async function updateProgramNote(
  actor: ProgramKerjaActor,
  id: string,
  input: UpdateProgramNoteInput,
): Promise<PgProgramKerja> {
  assertActive(actor);
  if (!canUpdateProgramNote(actor.role)) {
    throw new ProgramKerjaForbiddenError();
  }
  await getProgramOrThrow(id);
  const updated = await updateProgramNoteRow(id, input.note);
  if (!updated) {
    throw new ProgramKerjaNotFoundError();
  }
  return updated;
}

export async function updateProgramEvidence(
  actor: ProgramKerjaActor,
  id: string,
  input: UpdateProgramEvidenceInput,
): Promise<PgProgramKerja> {
  assertActive(actor);
  if (!canUpdateProgramEvidence(actor.role)) {
    throw new ProgramKerjaForbiddenError();
  }
  await getProgramOrThrow(id);
  const updated = await updateProgramEvidenceRow(id, input.evidenceUrl);
  if (!updated) {
    throw new ProgramKerjaNotFoundError();
  }
  return updated;
}

export async function deleteProgram(
  actor: ProgramKerjaActor,
  id: string,
): Promise<{ deleted: true; id: string }> {
  assertManageAccess(actor);
  await getProgramOrThrow(id);
  const db = getPgDb();
  await db.transaction(async (tx) => {
    const ok = await deleteProgramRow(id, tx);
    if (!ok) {
      throw new ProgramKerjaNotFoundError();
    }
  });
  return { deleted: true, id };
}
