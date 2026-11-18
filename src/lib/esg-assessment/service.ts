import { isForeignKeyViolation, isUniqueViolation } from "@/lib/pg/errors";
import {
  GreenBuildingEsgConflictError,
  GreenBuildingEsgNotFoundError,
  GreenBuildingEsgValidationError,
  type GreenBuildingEsgActor,
} from "@/lib/green-building-esg/service";
import {
  GreenBuildingEsgForbiddenError,
  assertManageAccess,
  assertViewAccess,
} from "@/lib/green-building-esg/access";
import { findMasterProjectRef } from "@/lib/green-building-esg/repository";
import {
  deleteProjectEsgAssessmentRow,
  findProjectEsgAssessmentRowById,
  insertProjectEsgAssessment,
  listAvailableEsgYears,
  listProjectEsgAssessmentRows,
  updateProjectEsgAssessmentRow,
  updateProjectEsgMonthStatus,
  type ProjectEsgAssessmentRow,
} from "@/lib/esg-assessment/repository";
import type {
  CreateProjectEsgAssessmentInput,
  UpdateProjectEsgAssessmentInput,
} from "@/lib/esg-assessment/schema";
import type { EsgMonthStatus } from "@/lib/esg-assessment/constants";

// Service layer for Penilaian ESG. Permission enforcement (philosophy: API and
// service are the final boundary, the UI only hides controls) reuses the
// Green Building & ESG guards and error types so the HTTP helper can map every
// failure without a second mapping table.

export type EsgMonthCellDto = {
  month: number;
  status: EsgMonthStatus | null;
};

export type ProjectEsgAssessmentProjectDto = {
  project_id: string;
  name: string;
  location: string;
  project_year: number;
};

export type ProjectEsgAssessmentDto = {
  id: string;
  project: ProjectEsgAssessmentProjectDto;
  year: number;
  documentation_url: string | null;
  months: EsgMonthCellDto[];
  completed_months: number;
  half_months: number;
  created_at: string;
  updated_at: string;
};

export type ProjectEsgAssessmentList = {
  items: ProjectEsgAssessmentDto[];
  available_years: number[];
};

export type ProjectEsgAssessmentFilters = {
  year?: number;
  search?: string;
};

type EsgActor = GreenBuildingEsgActor;

function assertActive(actor: EsgActor): void {
  if (actor.status !== "active") {
    throw new GreenBuildingEsgForbiddenError();
  }
}

function assertViewActor(actor: EsgActor): void {
  assertActive(actor);
  assertViewAccess(actor.role);
}

function assertManageActor(actor: EsgActor): void {
  assertActive(actor);
  assertManageAccess(actor.role);
}

function toMonthCell(
  month: number,
  status: string | null,
): EsgMonthCellDto {
  return {
    month,
    status: status === "Complete" || status === "Half" ? status : null,
  };
}

function toMonthCells(row: ProjectEsgAssessmentRow): EsgMonthCellDto[] {
  return [
    toMonthCell(1, row.month1Status),
    toMonthCell(2, row.month2Status),
    toMonthCell(3, row.month3Status),
    toMonthCell(4, row.month4Status),
    toMonthCell(5, row.month5Status),
    toMonthCell(6, row.month6Status),
    toMonthCell(7, row.month7Status),
    toMonthCell(8, row.month8Status),
    toMonthCell(9, row.month9Status),
    toMonthCell(10, row.month10Status),
    toMonthCell(11, row.month11Status),
    toMonthCell(12, row.month12Status),
  ];
}

// Counters are derived, never stored, so they cannot drift from the grid.
function toProjectEsgAssessmentDto(
  row: ProjectEsgAssessmentRow,
): ProjectEsgAssessmentDto {
  const months = toMonthCells(row);
  return {
    id: row.id,
    project: {
      project_id: row.projectId,
      name: row.projectName,
      location: row.projectLocation,
      project_year: row.projectYear,
    },
    year: row.year,
    documentation_url: row.documentationUrl,
    months,
    completed_months: months.filter((cell) => cell.status === "Complete").length,
    half_months: months.filter((cell) => cell.status === "Half").length,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function hasSqlState(error: unknown, code: string, depth = 0): boolean {
  if (depth > 3 || typeof error !== "object" || error === null) {
    return false;
  }
  const state = (error as { code?: unknown }).code;
  if (state === code) return true;
  const cause = (error as { cause?: unknown }).cause;
  return cause === error ? false : hasSqlState(cause, code, depth + 1);
}

function mapWriteError(error: unknown): never {
  if (
    error instanceof GreenBuildingEsgForbiddenError ||
    error instanceof GreenBuildingEsgNotFoundError ||
    error instanceof GreenBuildingEsgConflictError ||
    error instanceof GreenBuildingEsgValidationError
  ) {
    throw error;
  }
  if (isUniqueViolation(error)) {
    throw new GreenBuildingEsgConflictError(
      "Penilaian ESG untuk proyek dan tahun ini sudah ada.",
    );
  }
  if (isForeignKeyViolation(error)) {
    throw new GreenBuildingEsgConflictError(
      "Master Project terkait sudah tidak tersedia. Muat ulang data terbaru.",
    );
  }
  if (hasSqlState(error, "23514")) {
    throw new GreenBuildingEsgValidationError(
      "Data penilaian tidak memenuhi aturan database.",
    );
  }
  throw error;
}

async function getAssessmentOrThrow(
  id: string,
): Promise<ProjectEsgAssessmentRow> {
  const row = await findProjectEsgAssessmentRowById(id);
  if (!row) {
    throw new GreenBuildingEsgNotFoundError("Penilaian ESG tidak ditemukan");
  }
  return row;
}

// `year` comes from the Master Project, never from the client body.
async function resolveProjectYear(projectId: string): Promise<number> {
  const project = await findMasterProjectRef(projectId);
  if (!project) {
    throw new GreenBuildingEsgNotFoundError("Master Project tidak ditemukan");
  }
  return project.year;
}

export async function listProjectEsgAssessments(
  actor: EsgActor,
  filters: ProjectEsgAssessmentFilters = {},
): Promise<ProjectEsgAssessmentList> {
  assertViewActor(actor);
  const [rows, availableYears] = await Promise.all([
    listProjectEsgAssessmentRows(filters.year, filters.search),
    listAvailableEsgYears(),
  ]);
  return {
    items: rows.map(toProjectEsgAssessmentDto),
    available_years: availableYears,
  };
}

export async function createProjectEsgAssessment(
  actor: EsgActor,
  input: CreateProjectEsgAssessmentInput,
): Promise<ProjectEsgAssessmentDto> {
  assertManageActor(actor);
  const year = await resolveProjectYear(input.project_id);

  let id: string;
  try {
    id = await insertProjectEsgAssessment({
      projectId: input.project_id,
      year,
      documentationUrl: input.documentation_url,
      createdBy: actor.id,
    });
  } catch (error) {
    mapWriteError(error);
  }

  return toProjectEsgAssessmentDto(await getAssessmentOrThrow(id));
}

// Project changes are allowed. The year is re-snapshotted from the new project
// and all twelve month statuses are preserved; a (project_id, year) collision
// surfaces as 409 from the unique constraint.
export async function updateProjectEsgAssessment(
  actor: EsgActor,
  id: string,
  input: UpdateProjectEsgAssessmentInput,
): Promise<ProjectEsgAssessmentDto> {
  assertManageActor(actor);
  await getAssessmentOrThrow(id);
  const year = await resolveProjectYear(input.project_id);

  try {
    const updated = await updateProjectEsgAssessmentRow(id, {
      projectId: input.project_id,
      year,
      documentationUrl: input.documentation_url,
      updatedBy: actor.id,
    });
    if (!updated) {
      throw new GreenBuildingEsgNotFoundError("Penilaian ESG tidak ditemukan");
    }
  } catch (error) {
    mapWriteError(error);
  }

  return toProjectEsgAssessmentDto(await getAssessmentOrThrow(id));
}

// One month per request keeps concurrent edits on different months independent
// and returns the complete DTO so the grid reconciles counters without refetch.
export async function patchProjectEsgMonthStatus(
  actor: EsgActor,
  id: string,
  month: number,
  status: EsgMonthStatus | null,
): Promise<ProjectEsgAssessmentDto> {
  assertManageActor(actor);
  await getAssessmentOrThrow(id);

  try {
    const updated = await updateProjectEsgMonthStatus(
      id,
      month,
      status,
      actor.id,
    );
    if (!updated) {
      throw new GreenBuildingEsgNotFoundError("Penilaian ESG tidak ditemukan");
    }
  } catch (error) {
    mapWriteError(error);
  }

  return toProjectEsgAssessmentDto(await getAssessmentOrThrow(id));
}

export async function deleteProjectEsgAssessment(
  actor: EsgActor,
  id: string,
): Promise<{ deleted: true; id: string }> {
  assertManageActor(actor);
  await getAssessmentOrThrow(id);

  try {
    const deleted = await deleteProjectEsgAssessmentRow(id);
    if (!deleted) {
      throw new GreenBuildingEsgNotFoundError("Penilaian ESG tidak ditemukan");
    }
  } catch (error) {
    mapWriteError(error);
  }

  return { deleted: true, id };
}
