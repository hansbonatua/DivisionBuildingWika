import { asc, desc, eq, sql } from "drizzle-orm";
import { getPgDb } from "@/lib/pg/client";
import {
  masterProjects,
  mslAssessments,
  mslYearNotes,
  type NewPgMslAssessment,
  type NewPgMslYearNote,
} from "@/lib/pg/schema";

// MSL Engineering data access (V1 backend).
//
// This module is the ONLY boundary where PostgreSQL `numeric` strings are
// converted to numbers. Everything above it (service, API, UI) works with
// numbers exclusively, so no arithmetic is ever performed on a raw numeric
// string.
//
// Score and category are never selected or stored: they are derived by the
// service from the three stored components via @/lib/msl/score.

export type MslProjectRow = {
  id: string;
  name: string;
  location: string;
  year: number;
};

export type MslAssessmentRow = {
  id: string;
  projectId: string;
  engineeringValue: number;
  metodeKerja: number;
  engineeringExecution: number;
  remarks: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MslYearNoteRow = {
  id: string;
  year: number;
  note: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

// Inserts/updates take NUMBERS and the repository writes canonical two-decimal
// numeric strings — the exact mirror of the read path below. No numeric string
// ever crosses this module's boundary in either direction.
export type NewMslAssessmentData = {
  projectId: string;
  engineeringValue: number;
  metodeKerja: number;
  engineeringExecution: number;
  remarks: string | null;
  createdBy: string;
  updatedBy: string;
};

export type MslAssessmentMutableData = Partial<{
  engineeringValue: number;
  metodeKerja: number;
  engineeringExecution: number;
  remarks: string | null;
  updatedBy: string;
}>;

// numeric(3,2) comes back as a string from the driver; null is unreachable
// because all three components are NOT NULL, but the guard keeps the return
// type honest instead of emitting NaN.
function toNumber(value: string | null): number {
  return value === null ? Number.NaN : Number.parseFloat(value);
}

function toNumericString(value: number): string {
  return value.toFixed(2);
}

export async function listDistinctMslYears(): Promise<number[]> {
  const rows = await getPgDb()
    .selectDistinct({ year: masterProjects.year })
    .from(masterProjects)
    .orderBy(desc(masterProjects.year));
  return rows.map((row) => row.year);
}

export async function listMasterProjectsByYear(year: number): Promise<MslProjectRow[]> {
  return getPgDb()
    .select({
      id: masterProjects.id,
      name: masterProjects.name,
      location: masterProjects.location,
      year: masterProjects.year,
    })
    .from(masterProjects)
    .where(eq(masterProjects.year, year))
    .orderBy(asc(masterProjects.name), asc(masterProjects.location), asc(masterProjects.id));
}

// Bulk read: ONE query for the whole year (never one assessment per project).
export async function listAssessmentsByYear(year: number): Promise<MslAssessmentRow[]> {
  const rows = await getPgDb()
    .select({
      id: mslAssessments.id,
      projectId: mslAssessments.projectId,
      engineeringValue: mslAssessments.engineeringValue,
      metodeKerja: mslAssessments.metodeKerja,
      engineeringExecution: mslAssessments.engineeringExecution,
      remarks: mslAssessments.remarks,
      createdBy: mslAssessments.createdBy,
      updatedBy: mslAssessments.updatedBy,
      createdAt: mslAssessments.createdAt,
      updatedAt: mslAssessments.updatedAt,
    })
    .from(mslAssessments)
    .innerJoin(masterProjects, eq(mslAssessments.projectId, masterProjects.id))
    .where(eq(masterProjects.year, year));

  return rows.map((row) => ({
    ...row,
    engineeringValue: toNumber(row.engineeringValue),
    metodeKerja: toNumber(row.metodeKerja),
    engineeringExecution: toNumber(row.engineeringExecution),
  }));
}

export async function findAssessmentById(id: string): Promise<MslAssessmentRow | null> {
  const rows = await getPgDb()
    .select({
      id: mslAssessments.id,
      projectId: mslAssessments.projectId,
      engineeringValue: mslAssessments.engineeringValue,
      metodeKerja: mslAssessments.metodeKerja,
      engineeringExecution: mslAssessments.engineeringExecution,
      remarks: mslAssessments.remarks,
      createdBy: mslAssessments.createdBy,
      updatedBy: mslAssessments.updatedBy,
      createdAt: mslAssessments.createdAt,
      updatedAt: mslAssessments.updatedAt,
    })
    .from(mslAssessments)
    .where(eq(mslAssessments.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    engineeringValue: toNumber(row.engineeringValue),
    metodeKerja: toNumber(row.metodeKerja),
    engineeringExecution: toNumber(row.engineeringExecution),
  };
}

export async function findAssessmentByProjectId(
  projectId: string,
): Promise<MslAssessmentRow | null> {
  const rows = await getPgDb()
    .select({ id: mslAssessments.id })
    .from(mslAssessments)
    .where(eq(mslAssessments.projectId, projectId))
    .limit(1);
  const row = rows[0];
  return row ? findAssessmentById(row.id) : null;
}

// Minimal project reference: existence + canonical year. The year is never
// copied onto the assessment.
export async function findMasterProjectRef(
  id: string,
): Promise<{ id: string; name: string; location: string; year: number } | null> {
  const rows = await getPgDb()
    .select({
      id: masterProjects.id,
      name: masterProjects.name,
      location: masterProjects.location,
      year: masterProjects.year,
    })
    .from(masterProjects)
    .where(eq(masterProjects.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// Used by the annual-note rule: a note may only exist for a year that has at
// least one Master Project, so no orphan note can be created for a year MSL
// does not cover.
export async function hasMasterProjectInYear(year: number): Promise<boolean> {
  const rows = await getPgDb()
    .select({ one: sql<number>`1` })
    .from(masterProjects)
    .where(eq(masterProjects.year, year))
    .limit(1);
  return rows.length > 0;
}

export async function insertAssessment(data: NewMslAssessmentData): Promise<string> {
  const rows = await getPgDb()
    .insert(mslAssessments)
    .values({
      projectId: data.projectId,
      engineeringValue: toNumericString(data.engineeringValue),
      metodeKerja: toNumericString(data.metodeKerja),
      engineeringExecution: toNumericString(data.engineeringExecution),
      remarks: data.remarks,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
    })
    .returning({ id: mslAssessments.id });
  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create MSL assessment");
  }
  return created.id;
}

export async function updateAssessmentRow(
  id: string,
  patch: MslAssessmentMutableData,
): Promise<boolean> {
  const values: Partial<NewPgMslAssessment> = { updatedAt: new Date() };
  if (patch.engineeringValue !== undefined) {
    values.engineeringValue = toNumericString(patch.engineeringValue);
  }
  if (patch.metodeKerja !== undefined) {
    values.metodeKerja = toNumericString(patch.metodeKerja);
  }
  if (patch.engineeringExecution !== undefined) {
    values.engineeringExecution = toNumericString(patch.engineeringExecution);
  }
  if (patch.remarks !== undefined) {
    values.remarks = patch.remarks;
  }
  if (patch.updatedBy !== undefined) {
    values.updatedBy = patch.updatedBy;
  }

  const rows = await getPgDb()
    .update(mslAssessments)
    .set(values)
    .where(eq(mslAssessments.id, id))
    .returning({ id: mslAssessments.id });
  return rows.length > 0;
}

export async function deleteAssessmentRow(id: string): Promise<boolean> {
  const rows = await getPgDb()
    .delete(mslAssessments)
    .where(eq(mslAssessments.id, id))
    .returning({ id: mslAssessments.id });
  return rows.length > 0;
}

export async function findYearNote(year: number): Promise<MslYearNoteRow | null> {
  const rows = await getPgDb()
    .select({
      id: mslYearNotes.id,
      year: mslYearNotes.year,
      note: mslYearNotes.note,
      createdBy: mslYearNotes.createdBy,
      updatedBy: mslYearNotes.updatedBy,
      createdAt: mslYearNotes.createdAt,
      updatedAt: mslYearNotes.updatedAt,
    })
    .from(mslYearNotes)
    .where(eq(mslYearNotes.year, year))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertYearNote(data: NewPgMslYearNote): Promise<string> {
  const rows = await getPgDb()
    .insert(mslYearNotes)
    .values(data)
    .returning({ id: mslYearNotes.id });
  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create MSL year note");
  }
  return created.id;
}

// updatedAt always moves; createdAt/createdBy are owned by the insert path.
export async function updateYearNote(
  year: number,
  data: { note: string | null; updatedBy: string },
): Promise<boolean> {
  const rows = await getPgDb()
    .update(mslYearNotes)
    .set({ note: data.note, updatedBy: data.updatedBy, updatedAt: new Date() })
    .where(eq(mslYearNotes.year, year))
    .returning({ id: mslYearNotes.id });
  return rows.length > 0;
}
