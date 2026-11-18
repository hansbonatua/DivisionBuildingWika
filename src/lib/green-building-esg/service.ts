import { isForeignKeyViolation } from "@/lib/pg/errors";
import {
  GreenBuildingEsgForbiddenError,
  assertManageAccess,
  assertViewAccess,
} from "@/lib/green-building-esg/access";
import {
  deleteProjectGreenCertificateRow,
  findMasterProjectRef,
  findProjectGreenCertificateRowById,
  insertProjectGreenCertificate,
  listAvailableCertificateYears,
  listProjectGreenCertificateRows,
  searchProjectOptionRows,
  updateProjectGreenCertificateRow,
  type ProjectGreenCertificateRow,
  type ProjectOptionRow,
} from "@/lib/green-building-esg/repository";
import type {
  CreateProjectGreenCertificateInput,
  UpdateProjectGreenCertificateInput,
} from "@/lib/green-building-esg/schema";

export type GreenBuildingEsgActor = {
  id: string;
  role: string;
  status: string;
};

export type ProjectGreenCertificateProjectDto = {
  project_id: string;
  name: string;
  location: string;
  project_year: number;
};

export type ProjectGreenCertificateDto = {
  id: string;
  project: ProjectGreenCertificateProjectDto;
  project_value: string;
  location: string;
  certificate_year: number;
  lembaga: string;
  level: string;
  status: string;
  documentation_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectGreenCertificateList = {
  items: ProjectGreenCertificateDto[];
  available_years: number[];
};

export type ProjectOptionDto = ProjectOptionRow;

export type ProjectGreenCertificateFilters = {
  year?: number;
  search?: string;
};

export class GreenBuildingEsgNotFoundError extends Error {
  constructor(message = "Sertifikat Green Building tidak ditemukan") {
    super(message);
    this.name = "GreenBuildingEsgNotFoundError";
  }
}

export class GreenBuildingEsgConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GreenBuildingEsgConflictError";
  }
}

export class GreenBuildingEsgValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GreenBuildingEsgValidationError";
  }
}

function assertActive(actor: GreenBuildingEsgActor): void {
  if (actor.status !== "active") {
    throw new GreenBuildingEsgForbiddenError();
  }
}

function assertViewActor(actor: GreenBuildingEsgActor): void {
  assertActive(actor);
  assertViewAccess(actor.role);
}

function assertManageActor(actor: GreenBuildingEsgActor): void {
  assertActive(actor);
  assertManageAccess(actor.role);
}

function toProjectGreenCertificateDto(
  row: ProjectGreenCertificateRow,
): ProjectGreenCertificateDto {
  return {
    id: row.id,
    project: {
      project_id: row.projectId,
      name: row.projectName,
      location: row.projectLocation,
      project_year: row.projectYear,
    },
    project_value: row.projectValue,
    location: row.location,
    certificate_year: row.certificateYear,
    lembaga: row.lembaga,
    level: row.level,
    status: row.status,
    documentation_url: row.documentationUrl,
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
  if (isForeignKeyViolation(error)) {
    throw new GreenBuildingEsgConflictError(
      "Master Project terkait sudah tidak tersedia. Muat ulang data terbaru.",
    );
  }
  if (hasSqlState(error, "23514")) {
    throw new GreenBuildingEsgValidationError(
      "Data sertifikat tidak memenuhi aturan database.",
    );
  }
  throw error;
}

async function validateProject(projectId: string): Promise<ProjectOptionRow> {
  const project = await findMasterProjectRef(projectId);
  if (!project) {
    throw new GreenBuildingEsgNotFoundError("Master Project tidak ditemukan");
  }
  return project;
}

async function getCertificateOrThrow(
  id: string,
): Promise<ProjectGreenCertificateRow> {
  const row = await findProjectGreenCertificateRowById(id);
  if (!row) {
    throw new GreenBuildingEsgNotFoundError();
  }
  return row;
}

export async function listProjectGreenCertificates(
  actor: GreenBuildingEsgActor,
  filters: ProjectGreenCertificateFilters = {},
): Promise<ProjectGreenCertificateList> {
  assertViewActor(actor);
  const [rows, availableYears] = await Promise.all([
    listProjectGreenCertificateRows(filters.year, filters.search),
    listAvailableCertificateYears(),
  ]);
  return {
    items: rows.map(toProjectGreenCertificateDto),
    available_years: availableYears,
  };
}

export async function createProjectGreenCertificate(
  actor: GreenBuildingEsgActor,
  input: CreateProjectGreenCertificateInput,
): Promise<ProjectGreenCertificateDto> {
  assertManageActor(actor);
  await validateProject(input.project_id);

  let id: string;
  try {
    id = await insertProjectGreenCertificate({
      projectId: input.project_id,
      projectValue: input.project_value,
      location: input.location,
      certificateYear: input.certificate_year,
      lembaga: input.lembaga,
      level: input.level,
      status: input.status,
      documentationUrl: input.documentation_url,
      createdBy: actor.id,
    });
  } catch (error) {
    mapWriteError(error);
  }

  return toProjectGreenCertificateDto(await getCertificateOrThrow(id));
}

export async function updateProjectGreenCertificate(
  actor: GreenBuildingEsgActor,
  id: string,
  input: UpdateProjectGreenCertificateInput,
): Promise<ProjectGreenCertificateDto> {
  assertManageActor(actor);
  await getCertificateOrThrow(id);
  await validateProject(input.project_id);

  try {
    const updated = await updateProjectGreenCertificateRow(id, {
      projectId: input.project_id,
      projectValue: input.project_value,
      location: input.location,
      certificateYear: input.certificate_year,
      lembaga: input.lembaga,
      level: input.level,
      status: input.status,
      documentationUrl: input.documentation_url,
      updatedBy: actor.id,
    });
    if (!updated) {
      throw new GreenBuildingEsgNotFoundError();
    }
  } catch (error) {
    mapWriteError(error);
  }

  return toProjectGreenCertificateDto(await getCertificateOrThrow(id));
}

export async function deleteProjectGreenCertificate(
  actor: GreenBuildingEsgActor,
  id: string,
): Promise<{ deleted: true; id: string }> {
  assertManageActor(actor);
  await getCertificateOrThrow(id);

  try {
    const deleted = await deleteProjectGreenCertificateRow(id);
    if (!deleted) {
      throw new GreenBuildingEsgNotFoundError();
    }
  } catch (error) {
    mapWriteError(error);
  }

  return { deleted: true, id };
}

export async function listProjectOptions(
  actor: GreenBuildingEsgActor,
  q?: string,
): Promise<ProjectOptionDto[]> {
  assertManageActor(actor);
  return searchProjectOptionRows(q);
}
