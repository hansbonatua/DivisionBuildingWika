import type { EsgMonthStatus } from "@/lib/esg-assessment/constants";

export type { EsgMonthStatus };

export type GreenBuildingProjectOption = {
  id: string;
  name: string;
  location: string;
  year: number;
};

export type GreenBuildingCertificate = {
  id: string;
  project: {
    project_id: string;
    name: string;
    location: string;
    project_year: number;
  };
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

export type GreenBuildingCertificateDialogState =
  | { mode: "create" }
  | { mode: "edit"; record: GreenBuildingCertificate };

// ---------------------------------------------------------------------------
// Database Green Building & ESG — Penilaian ESG (P4).
// ---------------------------------------------------------------------------

export type EsgMonthCell = {
  month: number;
  status: EsgMonthStatus | null;
};

export type EsgAssessment = {
  id: string;
  project: {
    project_id: string;
    name: string;
    location: string;
    project_year: number;
  };
  year: number;
  documentation_url: string | null;
  months: EsgMonthCell[];
  completed_months: number;
  half_months: number;
  created_at: string;
  updated_at: string;
};

export type EsgAssessmentDialogState =
  | { mode: "create" }
  | { mode: "edit"; record: EsgAssessment };
