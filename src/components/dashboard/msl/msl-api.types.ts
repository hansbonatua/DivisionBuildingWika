import type { MslCategory } from "@/lib/msl/score";

// Client-side mirror of the MSL API contract (GET /api/msl).
// Deliberately declared here rather than imported from @/lib/msl/service: the
// service module imports the repository (and therefore the database client) and
// must never be bundled into a Client Component. Same convention as the other
// dashboard api.types modules.

export type MslAssessmentDto = {
  id: string;
  projectId: string;
  // Assessment period. Immutable after creation; the YEAR is never sent here
  // because it belongs to the Master Project.
  assessmentMonth: number;
  engineeringValue: number;
  metodeKerja: number;
  engineeringExecution: number;
  // Derived server-side by the shared engine; never sent by the browser.
  score: number;
  category: MslCategory;
  remarks: string | null;
  updatedAt: string;
};

export type MslYearRowDto = {
  projectId: string;
  name: string;
  location: string;
  assessment: MslAssessmentDto | null;
};

export type MslYearNoteDto = {
  id: string;
  year: number;
  note: string | null;
  updatedAt: string;
};

export type MslYearViewDto = {
  year: number;
  // Selected month of the year view (1–12). The rows below only carry the
  // assessments of this month.
  month: number;
  years: number[];
  canManage: boolean;
  rows: MslYearRowDto[];
  note: MslYearNoteDto | null;
};
