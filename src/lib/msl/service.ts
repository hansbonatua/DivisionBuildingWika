import { canManageMsl, canViewMsl } from "@/lib/msl/access";
import {
  categorizeMslScore,
  computeMslScore,
  formatMslScore,
  type MslCategory,
} from "@/lib/msl/score";
import type {
  CreateMslAssessmentInput,
  MslYearNoteInput,
  UpdateMslAssessmentInput,
} from "@/lib/msl/schema";
import { formatMslPeriod, resolveDefaultMslMonth } from "@/lib/msl/period";
import {
  deleteAssessmentRow,
  findAssessmentById,
  findAssessmentByProjectMonth,
  findMasterProjectRef,
  findYearNote,
  hasMasterProjectInYear,
  insertAssessment,
  insertYearNote,
  listAssessmentsByYear,
  listDistinctMslYears,
  listMasterProjectsByYear,
  updateAssessmentRow,
  updateYearNote,
  type MslAssessmentMutableData,
  type MslAssessmentRow,
  type MslYearNoteRow,
} from "@/lib/msl/repository";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/pg/errors";

// MSL Engineering service (V2.1 backend).
//
// Responsibilities: authorization, business rules and the derivation of the
// canonical score/category. Route handlers only parse HTTP and map errors;
// repositories only touch rows. Score and category are ALWAYS derived here from
// the three stored components via @/lib/msl/score — never accepted from the
// client and never stored.
//
// Identity is (project, month). The YEAR is never stored: it is read from the
// selected Master Project rows. Months are fully independent — this service
// never requires an earlier month to be assessed before a later one.

export type MslActor = {
  id: string;
  role: string;
  status: string;
  mslAccess: boolean;
};

export type MslAssessmentItem = {
  id: string;
  projectId: string;
  assessmentMonth: number;
  engineeringValue: number;
  metodeKerja: number;
  engineeringExecution: number;
  score: number;
  category: MslCategory;
  remarks: string | null;
  updatedAt: string;
};

export type MslYearRow = {
  projectId: string;
  name: string;
  location: string;
  assessment: MslAssessmentItem | null;
};

export type MslYearNoteItem = {
  id: string;
  year: number;
  note: string | null;
  updatedAt: string;
};

export type MslYearView = {
  year: number;
  month: number;
  years: number[];
  canManage: boolean;
  rows: MslYearRow[];
  note: MslYearNoteItem | null;
};

export class MslForbiddenError extends Error {
  constructor(message = "Akses MSL Engineering ditolak") {
    super(message);
    this.name = "MslForbiddenError";
  }
}

export class MslNotFoundError extends Error {
  constructor(message = "Data MSL Engineering tidak ditemukan") {
    super(message);
    this.name = "MslNotFoundError";
  }
}

export class MslConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MslConflictError";
  }
}

export class MslValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MslValidationError";
  }
}

function assertActive(actor: MslActor): void {
  if (actor.status !== "active") {
    throw new MslForbiddenError();
  }
}

function assertViewAccess(actor: MslActor): void {
  assertActive(actor);
  if (!canViewMsl({ role: actor.role, mslAccess: actor.mslAccess })) {
    throw new MslForbiddenError();
  }
}

function assertManageAccess(actor: MslActor): void {
  assertActive(actor);
  if (!canManageMsl({ role: actor.role, mslAccess: actor.mslAccess })) {
    throw new MslForbiddenError();
  }
}

function toAssessmentItem(row: MslAssessmentRow): MslAssessmentItem {
  const score = computeMslScore({
    engineeringValue: row.engineeringValue,
    metodeKerja: row.metodeKerja,
    engineeringExecution: row.engineeringExecution,
  });
  return {
    id: row.id,
    projectId: row.projectId,
    assessmentMonth: row.assessmentMonth,
    engineeringValue: row.engineeringValue,
    metodeKerja: row.metodeKerja,
    engineeringExecution: row.engineeringExecution,
    score,
    category: categorizeMslScore(score),
    remarks: row.remarks,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toNoteItem(row: MslYearNoteRow): MslYearNoteItem {
  return {
    id: row.id,
    year: row.year,
    note: row.note,
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Default selected year: the current year when MSL actually has projects for
// it, otherwise the newest year that does. With no projects at all the current
// year is still returned so the response stays a valid (empty) year view.
export function resolveDefaultMslYear(availableYears: number[], now = new Date()): number {
  const currentYear = now.getFullYear();
  if (availableYears.includes(currentYear)) {
    return currentYear;
  }
  if (availableYears.length > 0) {
    // listDistinctMslYears returns descending order, so [0] is the newest.
    return availableYears[0];
  }
  return currentYear;
}

// The view is always YEAR + MONTH. Rows are every Master Project of the year;
// only the assessments of the selected month are attached, so a month with no
// data at all simply yields a list of unassessed rows instead of an error.
export async function getMslYearView(
  actor: MslActor,
  year?: number,
  month?: number,
): Promise<MslYearView> {
  assertViewAccess(actor);

  const years = await listDistinctMslYears();
  const selectedYear = year ?? resolveDefaultMslYear(years);
  const selectedMonth = month ?? resolveDefaultMslMonth();

  // Bulk reads only: projects, assessments and the note for the selected period
  // (plus the distinct-years query above). Never a per-project assessment query.
  const [projects, assessments, noteRow] = await Promise.all([
    listMasterProjectsByYear(selectedYear),
    listAssessmentsByYear(selectedYear, selectedMonth),
    findYearNote(selectedYear),
  ]);

  // The month is part of the bulk filter, so one entry per project is expected
  // here; the map is still keyed by project to keep the row join O(1).
  const assessmentsByProject = new Map(
    assessments.map((row) => [row.projectId, toAssessmentItem(row)]),
  );

  return {
    year: selectedYear,
    month: selectedMonth,
    years,
    canManage: canManageMsl({ role: actor.role, mslAccess: actor.mslAccess }),
    rows: projects.map((project) => ({
      projectId: project.id,
      name: project.name,
      location: project.location,
      assessment: assessmentsByProject.get(project.id) ?? null,
    })),
    note: noteRow ? toNoteItem(noteRow) : null,
  };
}

export async function createMslAssessment(
  actor: MslActor,
  input: CreateMslAssessmentInput,
): Promise<MslAssessmentItem> {
  assertManageAccess(actor);

  // The project must resolve to a live Master Project; the FK is the backstop
  // for the delete-between-check-and-insert race.
  const project = await findMasterProjectRef(input.projectId);
  if (!project) {
    throw new MslNotFoundError("Master Project tidak ditemukan");
  }

  // One assessment per project PER MONTH. A different month is always allowed,
  // and no earlier month has to exist first. Checked up front for a friendly
  // message; UNIQUE(project_id, assessment_month) remains the authoritative
  // guard.
  const existing = await findAssessmentByProjectMonth(
    input.projectId,
    input.assessmentMonth,
  );
  if (existing) {
    throw new MslConflictError(
      `Project ini sudah memiliki penilaian MSL untuk ${formatMslPeriod(project.year, input.assessmentMonth)}`,
    );
  }

  let id: string;
  try {
    id = await insertAssessment({
      projectId: input.projectId,
      assessmentMonth: input.assessmentMonth,
      engineeringValue: input.engineeringValue,
      metodeKerja: input.metodeKerja,
      engineeringExecution: input.engineeringExecution,
      remarks: input.remarks ?? null,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new MslConflictError(
        `Project ini sudah memiliki penilaian MSL untuk ${formatMslPeriod(project.year, input.assessmentMonth)}`,
      );
    }
    if (isForeignKeyViolation(error)) {
      throw new MslNotFoundError("Master Project tidak ditemukan");
    }
    throw error;
  }

  const row = await findAssessmentById(id);
  if (!row) {
    throw new MslNotFoundError();
  }
  return toAssessmentItem(row);
}

export async function updateMslAssessment(
  actor: MslActor,
  id: string,
  input: UpdateMslAssessmentInput,
): Promise<MslAssessmentItem> {
  assertManageAccess(actor);

  const existing = await findAssessmentById(id);
  if (!existing) {
    throw new MslNotFoundError("Penilaian MSL tidak ditemukan");
  }

  // Only the three components and remarks are mutable. projectId and
  // assessmentMonth are rejected by the strict schema — moving an assessment to
  // another month is a delete + create, never a PATCH.
  const patch: MslAssessmentMutableData = { updatedBy: actor.id };
  if (input.engineeringValue !== undefined) patch.engineeringValue = input.engineeringValue;
  if (input.metodeKerja !== undefined) patch.metodeKerja = input.metodeKerja;
  if (input.engineeringExecution !== undefined) {
    patch.engineeringExecution = input.engineeringExecution;
  }
  if (input.remarks !== undefined) patch.remarks = input.remarks;

  const updated = await updateAssessmentRow(id, patch);
  if (!updated) {
    throw new MslNotFoundError("Penilaian MSL tidak ditemukan");
  }

  const row = await findAssessmentById(id);
  if (!row) {
    throw new MslNotFoundError("Penilaian MSL tidak ditemukan");
  }
  return toAssessmentItem(row);
}

export async function deleteMslAssessment(
  actor: MslActor,
  id: string,
): Promise<{ deleted: true; id: string }> {
  assertManageAccess(actor);

  // Only the assessment row is removed. The Master Project is never touched.
  const deleted = await deleteAssessmentRow(id);
  if (!deleted) {
    throw new MslNotFoundError("Penilaian MSL tidak ditemukan");
  }
  return { deleted: true, id };
}

export async function saveMslYearNote(
  actor: MslActor,
  input: MslYearNoteInput,
): Promise<MslYearNoteItem> {
  assertManageAccess(actor);

  // A note only makes sense for a year MSL actually covers, so an orphan note
  // for a year without any Master Project is a 400 (the year is part of the
  // request payload, not the URL, so this is input validation rather than a
  // missing resource).
  const covered = await hasMasterProjectInYear(input.year);
  if (!covered) {
    throw new MslValidationError(
      `Tahun ${input.year} belum memiliki Master Project sehingga catatan MSL tidak dapat disimpan`,
    );
  }

  const note = input.note ?? null;
  const existing = await findYearNote(input.year);

  if (!existing) {
    try {
      await insertYearNote({
        year: input.year,
        note,
        createdBy: actor.id,
        updatedBy: actor.id,
      });
    } catch (error) {
      // Concurrent first save: the other request created the row, so this one
      // becomes an update instead of surfacing a unique violation.
      if (!isUniqueViolation(error)) {
        throw error;
      }
      await updateYearNote(input.year, { note, updatedBy: actor.id });
    }
  } else {
    await updateYearNote(input.year, { note, updatedBy: actor.id });
  }

  const saved = await findYearNote(input.year);
  if (!saved) {
    throw new MslNotFoundError("Catatan MSL tidak ditemukan");
  }
  return toNoteItem(saved);
}

// Re-exported for the API layer/tests: the canonical score formatting lives in
// the pure engine, not in the route layer.
export { formatMslScore };
