import type { MslCategory } from "@/lib/msl/score";

// Client-side mirror of the MSL API contract (GET /api/msl).
// Deliberately declared here rather than imported from @/lib/msl/service: the
// service module imports the repository (and therefore the database client) and
// must never be bundled into a Client Component. Same convention as the other
// dashboard api.types modules.

export type MslAssessmentDto = {
  id: string;
  projectId: string;
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
  years: number[];
  canManage: boolean;
  rows: MslYearRowDto[];
  note: MslYearNoteDto | null;
};
