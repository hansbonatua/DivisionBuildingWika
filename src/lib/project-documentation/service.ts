import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import {
  findProjectById,
  findProjectDocumentationViewByPeriod,
  getDocumentationSummary,
  listDocumentationYears,
  listProjectDocumentations,
  upsertProjectDocumentation,
  type ProjectDocumentationListRow,
  type ProjectDocumentationSummaryRow,
  type ProjectDocumentationUpdate,
} from "@/lib/project-documentation/repository";
import {
  PDOC_CATATAN_MAX,
  PDOC_URL_MAX,
  isSafePdocUrl,
  type UpdateProjectDocumentationInput,
} from "@/lib/project-documentation/schema";
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from "@/lib/pg/errors";
import { PDOC_WEEKS } from "@/lib/project-documentation/constants";

// Business logic for Project Documentation (PDOC).
//
// Master Project owns the rows; PDOC only updates the five week links and the
// note for one project-period. Permissions are feature-level and the actor
// always comes from the server session.

export type ProjectDocumentationActor = {
  id: string;
  role: string;
  status: string;
};

export type ProjectDocumentationPeriod = {
  year: number;
  month: number;
};

export type ProjectDocumentationUserRef = {
  user_id: string;
  name: string;
};

export type ProjectDocumentationWeekDto = {
  week: number;
  url: string | null;
  updated_by: ProjectDocumentationUserRef | null;
  updated_at: string | null;
};

export type ProjectDocumentationDto = {
  project_id: string;
  project_name: string;
  project_location: string;
  project_year: number;
  year: number;
  month: number;
  documented: boolean;
  weeks: ProjectDocumentationWeekDto[];
  catatan: string | null;
  updated_by: ProjectDocumentationUserRef | null;
  updated_at: string | null;
};

export type ProjectDocumentationListDto = {
  period: ProjectDocumentationPeriod;
  available_years: number[];
  rows: ProjectDocumentationDto[];
};

export type ProjectDocumentationSummaryMonthDto = {
  month: number;
  completed_weeks: number;
  total_weeks: number;
  documented: boolean;
};

export type ProjectDocumentationSummaryProjectDto = {
  project_id: string;
  project_name: string;
  project_location: string;
  project_year: number;
  months: ProjectDocumentationSummaryMonthDto[];
};

export type ProjectDocumentationSummaryDto = {
  year: number;
  available_years: number[];
  months: { month: number; label: string }[];
  rows: ProjectDocumentationSummaryProjectDto[];
};

export const PDOC_TOTAL_WEEKS = PDOC_WEEKS.length;

const SUMMARY_MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

export class ProjectDocumentationForbiddenError extends Error {
  constructor(message = "Akses Project Documentation ditolak") {
    super(message);
    this.name = "ProjectDocumentationForbiddenError";
  }
}

export class ProjectDocumentationNotFoundError extends Error {
  constructor(message = "Master Project tidak ditemukan") {
    super(message);
    this.name = "ProjectDocumentationNotFoundError";
  }
}

export class ProjectDocumentationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectDocumentationConflictError";
  }
}

export class ProjectDocumentationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectDocumentationValidationError";
  }
}

export function canViewDocumentation(role: string): boolean {
  return hasPermission(role, PERMISSIONS.DOCUMENTATION_VIEW);
}

export function canManageDocumentation(role: string): boolean {
  return hasPermission(role, PERMISSIONS.DOCUMENTATION_MANAGE);
}

function assertActive(actor: ProjectDocumentationActor): void {
  if (actor.status !== "active") {
    throw new ProjectDocumentationForbiddenError();
  }
}

export function assertViewAccess(actor: ProjectDocumentationActor): void {
  assertActive(actor);
  if (!canViewDocumentation(actor.role)) {
    throw new ProjectDocumentationForbiddenError();
  }
}

export function assertManageAccess(actor: ProjectDocumentationActor): void {
  assertActive(actor);
  if (!canManageDocumentation(actor.role)) {
    throw new ProjectDocumentationForbiddenError();
  }
}

export function normalizeDocumentationUrl(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  const normalized = value?.trim() ?? "";
  if (normalized.length === 0) {
    return null;
  }
  if (normalized.length > PDOC_URL_MAX) {
    throw new ProjectDocumentationValidationError(
      `URL minggu maksimal ${PDOC_URL_MAX} karakter`,
    );
  }
  if (!isSafePdocUrl(normalized)) {
    throw new ProjectDocumentationValidationError(
      "URL minggu harus diawali http:// atau https://",
    );
  }
  return normalized;
}

export function normalizeDocumentationCatatan(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  const normalized = value?.trim() ?? "";
  if (normalized.length > PDOC_CATATAN_MAX) {
    throw new ProjectDocumentationValidationError(
      `Catatan maksimal ${PDOC_CATATAN_MAX} karakter`,
    );
  }
  return normalized.length > 0 ? normalized : null;
}

function toUserRef(
  userId: string | null,
  name: string | null,
): ProjectDocumentationUserRef | null {
  if (!userId) {
    return null;
  }
  return { user_id: userId, name: name ?? "—" };
}

function toWeekDto(
  week: number,
  url: string | null,
  userId: string | null,
  userName: string | null,
  updatedAt: Date | null,
): ProjectDocumentationWeekDto {
  return {
    week,
    url,
    updated_by: toUserRef(userId, userName),
    updated_at: updatedAt ? updatedAt.toISOString() : null,
  };
}

export function toProjectDocumentationDto(
  row: ProjectDocumentationListRow,
  period: ProjectDocumentationPeriod,
): ProjectDocumentationDto {
  return {
    project_id: row.projectId,
    project_name: row.projectName,
    project_location: row.projectLocation,
    project_year: row.projectYear,
    year: period.year,
    month: period.month,
    documented: row.documentationId !== null,
    weeks: [
      toWeekDto(
        PDOC_WEEKS[0],
        row.week1Url,
        row.week1UpdatedById,
        row.week1UpdatedByName,
        row.week1UpdatedAt,
      ),
      toWeekDto(
        PDOC_WEEKS[1],
        row.week2Url,
        row.week2UpdatedById,
        row.week2UpdatedByName,
        row.week2UpdatedAt,
      ),
      toWeekDto(
        PDOC_WEEKS[2],
        row.week3Url,
        row.week3UpdatedById,
        row.week3UpdatedByName,
        row.week3UpdatedAt,
      ),
      toWeekDto(
        PDOC_WEEKS[3],
        row.week4Url,
        row.week4UpdatedById,
        row.week4UpdatedByName,
        row.week4UpdatedAt,
      ),
      toWeekDto(
        PDOC_WEEKS[4],
        row.week5Url,
        row.week5UpdatedById,
        row.week5UpdatedByName,
        row.week5UpdatedAt,
      ),
    ],
    catatan: row.catatan,
    updated_by: toUserRef(row.updatedById, row.updatedByName),
    updated_at: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

function countWeekUrl(value: string | null): number {
  return value ? 1 : 0;
}

export function countCompletedWeeks(
  row: Pick<
    ProjectDocumentationSummaryRow,
    "week1Url" | "week2Url" | "week3Url" | "week4Url" | "week5Url"
  >,
): number {
  return (
    countWeekUrl(row.week1Url) +
    countWeekUrl(row.week2Url) +
    countWeekUrl(row.week3Url) +
    countWeekUrl(row.week4Url) +
    countWeekUrl(row.week5Url)
  );
}

function createEmptySummaryMonths(): ProjectDocumentationSummaryMonthDto[] {
  return Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    completed_weeks: 0,
    total_weeks: PDOC_TOTAL_WEEKS,
    documented: false,
  }));
}

export function buildProjectDocumentationSummary(
  rows: ProjectDocumentationSummaryRow[],
  year: number,
  availableYears: number[],
): ProjectDocumentationSummaryDto {
  const projects = new Map<string, ProjectDocumentationSummaryProjectDto>();

  for (const row of rows) {
    let project = projects.get(row.projectId);
    if (!project) {
      project = {
        project_id: row.projectId,
        project_name: row.projectName,
        project_location: row.projectLocation,
        project_year: row.projectYear,
        months: createEmptySummaryMonths(),
      };
      projects.set(row.projectId, project);
    }

    if (
      row.documentationId !== null &&
      row.month !== null &&
      row.month >= 1 &&
      row.month <= 12
    ) {
      project.months[row.month - 1] = {
        month: row.month,
        completed_weeks: countCompletedWeeks(row),
        total_weeks: PDOC_TOTAL_WEEKS,
        documented: true,
      };
    }
  }

  return {
    year,
    available_years: availableYears,
    months: SUMMARY_MONTH_LABELS.map((label, index) => ({
      month: index + 1,
      label,
    })),
    rows: [...projects.values()],
  };
}

function buildAvailableYears(
  years: number[],
  selectedYear: number,
): number[] {
  const currentYear = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
    }).format(new Date()),
  );
  return [...new Set([selectedYear, currentYear, ...years])]
    .filter((year) => Number.isInteger(year) && year >= 2000)
    .sort((left, right) => right - left);
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
    error instanceof ProjectDocumentationForbiddenError ||
    error instanceof ProjectDocumentationNotFoundError ||
    error instanceof ProjectDocumentationConflictError ||
    error instanceof ProjectDocumentationValidationError
  ) {
    throw error;
  }
  if (isForeignKeyViolation(error)) {
    throw new ProjectDocumentationConflictError(
      "Master Project atau user sudah tidak tersedia. Muat ulang data terbaru.",
    );
  }
  if (isUniqueViolation(error)) {
    throw new ProjectDocumentationConflictError(
      "Dokumentasi project sudah ada. Muat ulang data terbaru.",
    );
  }
  if (hasSqlState(error, "23514")) {
    throw new ProjectDocumentationValidationError(
      "Data Project Documentation tidak memenuhi aturan database.",
    );
  }
  throw error;
}

export async function listDocumentations(
  actor: ProjectDocumentationActor,
  year: number,
  month: number,
): Promise<ProjectDocumentationListDto> {
  assertViewAccess(actor);
  const [rows, years] = await Promise.all([
    listProjectDocumentations(year, month),
    listDocumentationYears(),
  ]);
  const period = { year, month };
  return {
    period,
    available_years: buildAvailableYears(years, year),
    rows: rows.map((row) => toProjectDocumentationDto(row, period)),
  };
}

export async function updateDocumentation(
  actor: ProjectDocumentationActor,
  projectId: string,
  year: number,
  month: number,
  input: UpdateProjectDocumentationInput,
): Promise<ProjectDocumentationDto> {
  assertManageAccess(actor);

  const project = await findProjectById(projectId);
  if (!project) {
    throw new ProjectDocumentationNotFoundError();
  }

  const data: ProjectDocumentationUpdate = {
    week1Url: normalizeDocumentationUrl(input.week_1_url),
    week2Url: normalizeDocumentationUrl(input.week_2_url),
    week3Url: normalizeDocumentationUrl(input.week_3_url),
    week4Url: normalizeDocumentationUrl(input.week_4_url),
    week5Url: normalizeDocumentationUrl(input.week_5_url),
    catatan: normalizeDocumentationCatatan(input.catatan),
  };

  try {
    await upsertProjectDocumentation(projectId, year, month, data, actor.id);
  } catch (error) {
    mapWriteError(error);
  }

  const row = await findProjectDocumentationViewByPeriod(projectId, year, month);
  if (!row) {
    throw new ProjectDocumentationNotFoundError();
  }
  return toProjectDocumentationDto(row, { year, month });
}

export async function getSummary(
  actor: ProjectDocumentationActor,
  year: number,
): Promise<ProjectDocumentationSummaryDto> {
  assertViewAccess(actor);
  const [rows, years] = await Promise.all([
    getDocumentationSummary(year),
    listDocumentationYears(),
  ]);
  return buildProjectDocumentationSummary(
    rows,
    year,
    buildAvailableYears(years, year),
  );
}
