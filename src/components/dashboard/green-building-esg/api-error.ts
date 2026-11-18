import type {
  EsgAssessment,
  GreenBuildingCertificate,
  GreenBuildingProjectOption,
} from "@/components/dashboard/green-building-esg/types";

type ApiErrorBody = {
  error?: {
    message?: string;
    details?: Record<string, string[] | undefined>;
  };
};

function firstValidationDetail(
  details: Record<string, string[] | undefined> | undefined,
): string | null {
  if (!details) return null;
  for (const messages of Object.values(details)) {
    const message = messages?.find((value) => value.trim() !== "");
    if (message) return message;
  }
  return null;
}

export async function readGreenBuildingApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    const detail = firstValidationDetail(body.error?.details);
    if (detail) return detail;
    if (body.error?.message && body.error.message.trim() !== "") {
      return body.error.message;
    }
  } catch {
    /* non-JSON error body */
  }
  if (response.status === 401) {
    return "Sesi Anda berakhir. Silakan masuk kembali.";
  }
  if (response.status === 403) {
    return "Anda tidak memiliki akses untuk mengubah Sertifikasi Green Building.";
  }
  if (response.status === 404) {
    return "Data sudah tidak tersedia. Muat ulang halaman.";
  }
  return fallback;
}

export function isGreenBuildingCertificate(
  value: unknown,
): value is GreenBuildingCertificate {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Partial<GreenBuildingCertificate>;
  return (
    typeof row.id === "string" &&
    typeof row.project === "object" &&
    row.project !== null &&
    typeof row.project.project_id === "string" &&
    typeof row.project.name === "string" &&
    typeof row.project.location === "string" &&
    typeof row.project.project_year === "number" &&
    typeof row.project_value === "string" &&
    typeof row.location === "string" &&
    typeof row.certificate_year === "number" &&
    typeof row.lembaga === "string" &&
    typeof row.level === "string" &&
    typeof row.status === "string" &&
    (row.documentation_url === null ||
      typeof row.documentation_url === "string")
  );
}

// Penilaian ESG keeps its own 403 wording: a read-only role must not be told
// it lacks access to the Sertifikasi module.
export async function readEsgApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    const detail = firstValidationDetail(body.error?.details);
    if (detail) return detail;
    if (body.error?.message && body.error.message.trim() !== "") {
      return body.error.message;
    }
  } catch {
    /* non-JSON error body */
  }
  if (response.status === 401) {
    return "Sesi Anda berakhir. Silakan masuk kembali.";
  }
  if (response.status === 403) {
    return "Anda tidak memiliki akses untuk mengubah Penilaian ESG.";
  }
  if (response.status === 404) {
    return "Data sudah tidak tersedia. Muat ulang halaman.";
  }
  return fallback;
}

function isEsgMonthCell(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const cell = value as { month?: unknown; status?: unknown };
  return (
    typeof cell.month === "number" &&
    (cell.status === null ||
      cell.status === "Complete" ||
      cell.status === "Half")
  );
}

export function isEsgAssessment(value: unknown): value is EsgAssessment {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Partial<EsgAssessment>;
  return (
    typeof row.id === "string" &&
    typeof row.project === "object" &&
    row.project !== null &&
    typeof row.project.project_id === "string" &&
    typeof row.project.name === "string" &&
    typeof row.project.location === "string" &&
    typeof row.project.project_year === "number" &&
    typeof row.year === "number" &&
    (row.documentation_url === null ||
      typeof row.documentation_url === "string") &&
    Array.isArray(row.months) &&
    row.months.length === 12 &&
    row.months.every(isEsgMonthCell) &&
    typeof row.completed_months === "number" &&
    typeof row.half_months === "number" &&
    typeof row.created_at === "string" &&
    typeof row.updated_at === "string"
  );
}

export function isGreenBuildingProjectOption(
  value: unknown,
): value is GreenBuildingProjectOption {
  if (typeof value !== "object" || value === null) return false;
  const option = value as Partial<GreenBuildingProjectOption>;
  return (
    typeof option.id === "string" &&
    typeof option.name === "string" &&
    typeof option.location === "string" &&
    typeof option.year === "number"
  );
}
