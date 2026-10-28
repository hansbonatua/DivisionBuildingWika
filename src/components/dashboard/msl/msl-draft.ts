import { categorizeMslScore, computeMslScore, formatMslScore, type MslCategory } from "@/lib/msl/score";
import type { MslAssessmentDto } from "./msl-api.types";

// Draft helpers shared by the MSL page and table. The score formula and the
// category bands are NEVER reimplemented here: previews call the Phase 3 pure
// engine, so the number shown while typing is exactly what the backend derives.

export const MSL_NOTE_MAX_LENGTH = 2000;

export type MslDraft = {
  engineeringValue: string;
  metodeKerja: string;
  engineeringExecution: string;
  remarks: string;
};

export const EMPTY_MSL_DRAFT: MslDraft = {
  engineeringValue: "",
  metodeKerja: "",
  engineeringExecution: "",
  remarks: "",
};

// Empty is tolerated while typing (null), anything outside the locked input
// scale or with a third decimal is invalid.
export function parseMslComponentInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return null;
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 1 || value > 5) {
    return null;
  }
  const scaled = value * 100;
  if (Math.abs(scaled - Math.round(scaled)) > 1e-9) {
    return null;
  }
  return value;
}

export function previewMslDraft(
  draft: MslDraft,
): { score: number; category: MslCategory } | null {
  const engineeringValue = parseMslComponentInput(draft.engineeringValue);
  const metodeKerja = parseMslComponentInput(draft.metodeKerja);
  const engineeringExecution = parseMslComponentInput(draft.engineeringExecution);
  if (engineeringValue === null || metodeKerja === null || engineeringExecution === null) {
    return null;
  }
  const score = computeMslScore({ engineeringValue, metodeKerja, engineeringExecution });
  return { score, category: categorizeMslScore(score) };
}

// Server values are canonical two-decimal numbers; prefill them in that same
// form so an untouched edit draft never looks dirty.
export function toMslDraft(assessment: MslAssessmentDto | null): MslDraft {
  if (!assessment) {
    return { ...EMPTY_MSL_DRAFT };
  }
  return {
    engineeringValue: formatMslScore(assessment.engineeringValue),
    metodeKerja: formatMslScore(assessment.metodeKerja),
    engineeringExecution: formatMslScore(assessment.engineeringExecution),
    remarks: assessment.remarks ?? "",
  };
}

export function draftEquals(a: MslDraft, b: MslDraft): boolean {
  return (
    a.engineeringValue === b.engineeringValue &&
    a.metodeKerja === b.metodeKerja &&
    a.engineeringExecution === b.engineeringExecution &&
    a.remarks === b.remarks
  );
}

export function isEmptyDraft(draft: MslDraft): boolean {
  return (
    draft.engineeringValue.trim() === "" &&
    draft.metodeKerja.trim() === "" &&
    draft.engineeringExecution.trim() === "" &&
    draft.remarks.trim() === ""
  );
}

type MslScorePayload = {
  engineeringValue: number;
  metodeKerja: number;
  engineeringExecution: number;
};

// Returns null when any component is missing or invalid, so nothing is ever
// sent to the API for a partial row.
function parseComponentPayload(draft: MslDraft):
  | (MslScorePayload & { remarks: string | null })
  | null {
  const engineeringValue = parseMslComponentInput(draft.engineeringValue);
  const metodeKerja = parseMslComponentInput(draft.metodeKerja);
  const engineeringExecution = parseMslComponentInput(draft.engineeringExecution);
  if (engineeringValue === null || metodeKerja === null || engineeringExecution === null) {
    return null;
  }
  const remarks = draft.remarks.trim();
  return {
    engineeringValue,
    metodeKerja,
    engineeringExecution,
    remarks: remarks === "" ? null : remarks,
  };
}

// POST contract: remarks is `optional()` only — an empty remarks must be
// OMITTED (null is rejected by the frozen create schema with a 400).
export function draftToCreatePayload(draft: MslDraft):
  | (MslScorePayload & { remarks?: string })
  | null {
  const parsed = parseComponentPayload(draft);
  if (!parsed) {
    return null;
  }
  const { engineeringValue, metodeKerja, engineeringExecution, remarks } = parsed;
  return remarks === null
    ? { engineeringValue, metodeKerja, engineeringExecution }
    : { engineeringValue, metodeKerja, engineeringExecution, remarks };
}

// PATCH contract: remarks is `nullable().optional()`, so an explicit null is
// the only way to CLEAR previously saved remarks.
export function draftToUpdatePayload(draft: MslDraft):
  | (MslScorePayload & { remarks: string | null })
  | null {
  return parseComponentPayload(draft);
}

export const MSL_INPUT_HINT =
  "Nilai harus antara 1.00 dan 5.00 dengan maksimal 2 angka desimal.";
