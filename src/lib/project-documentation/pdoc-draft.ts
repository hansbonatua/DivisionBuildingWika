import { PDOC_WEEKS } from "@/lib/project-documentation/constants";

// Client-side mirror of the Project Documentation API contract.
//
// Deliberately declared here rather than imported from the service: the service
// imports the repository and database client and must never be bundled into a
// Client Component.

export const PDOC_URL_MAX = 2048;
export const PDOC_CATATAN_MAX = 2000;

export type PdocUserRef = {
  user_id: string;
  name: string;
};

export type PdocWeekDto = {
  week: number;
  url: string | null;
  updated_by: PdocUserRef | null;
  updated_at: string | null;
};

export type PdocRowDto = {
  project_id: string;
  project_name: string;
  project_location: string;
  project_year: number;
  weeks: PdocWeekDto[];
  catatan: string | null;
  updated_by: PdocUserRef | null;
  updated_at: string | null;
};

export type PdocWeeks = [string, string, string, string, string];

export type PdocDraft = {
  weeks: PdocWeeks;
  catatan: string;
};

export type PdocEditingState = {
  projectId: string;
  draft: PdocDraft;
  initial: PdocDraft;
  error: string | null;
};

export type PdocDraftField =
  | "week_1_url"
  | "week_2_url"
  | "week_3_url"
  | "week_4_url"
  | "week_5_url"
  | "catatan";

export type PdocDraftError = {
  field: PdocDraftField;
  message: string;
};

export type PdocUpdatePayload = {
  week_1_url: string | null;
  week_2_url: string | null;
  week_3_url: string | null;
  week_4_url: string | null;
  week_5_url: string | null;
  catatan: string | null;
};

export const EMPTY_PDOC_DRAFT: PdocDraft = {
  weeks: ["", "", "", "", ""],
  catatan: "",
};

export function toPdocDraft(row: PdocRowDto): PdocDraft {
  const byWeek = new Map(row.weeks.map((week) => [week.week, week.url ?? ""]));
  return {
    weeks: PDOC_WEEKS.map((week) => byWeek.get(week) ?? "") as PdocWeeks,
    catatan: row.catatan ?? "",
  };
}

export function pdocDraftEquals(a: PdocDraft, b: PdocDraft): boolean {
  return (
    a.catatan === b.catatan &&
    a.weeks.every((value, index) => value === b.weeks[index])
  );
}

export function draftEquals(a: PdocDraft, b: PdocDraft): boolean {
  return pdocDraftEquals(a, b);
}

export function setPdocWeek(
  draft: PdocDraft,
  index: number,
  value: string,
): PdocDraft {
  if (!Number.isInteger(index) || index < 0 || index >= PDOC_WEEKS.length) {
    return draft;
  }
  const weeks = [...draft.weeks] as PdocWeeks;
  weeks[index] = value;
  return { ...draft, weeks };
}

export function isSafePdocUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

// Pure validation mirroring the server schema so the row can show its own error
// before any request is sent.
export function validatePdocDraft(draft: PdocDraft): PdocDraftError | null {
  for (let index = 0; index < PDOC_WEEKS.length; index += 1) {
    const value = draft.weeks[index].trim();
    const field = `week_${index + 1}_url` as PdocDraftField;
    if (value.length > PDOC_URL_MAX) {
      return {
        field,
        message: `Minggu ${index + 1}: URL maksimal ${PDOC_URL_MAX.toLocaleString("id-ID")} karakter.`,
      };
    }
    if (value.length > 0 && !isSafePdocUrl(value)) {
      return {
        field,
        message: `Minggu ${index + 1}: URL harus diawali http:// atau https://.`,
      };
    }
  }

  if (draft.catatan.trim().length > PDOC_CATATAN_MAX) {
    return {
      field: "catatan",
      message: `Catatan maksimal ${PDOC_CATATAN_MAX.toLocaleString("id-ID")} karakter.`,
    };
  }
  return null;
}

function normalizeOptional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Returns null instead of a partial payload when the draft is invalid.
export function draftToUpdatePayload(draft: PdocDraft): PdocUpdatePayload | null {
  if (validatePdocDraft(draft) !== null) {
    return null;
  }
  return {
    week_1_url: normalizeOptional(draft.weeks[0]),
    week_2_url: normalizeOptional(draft.weeks[1]),
    week_3_url: normalizeOptional(draft.weeks[2]),
    week_4_url: normalizeOptional(draft.weeks[3]),
    week_5_url: normalizeOptional(draft.weeks[4]),
    catatan: normalizeOptional(draft.catatan),
  };
}

export function formatPdocTimestamp(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function formatPdocMetadata(week: PdocWeekDto): string {
  return `Oleh: ${week.updated_by?.name ?? "—"}, ${formatPdocTimestamp(week.updated_at)}`;
}

// Search is client-side and scoped to project name, as required by the PDOC UI.
export function filterPdocRows(
  rows: readonly PdocRowDto[],
  search: string,
): PdocRowDto[] {
  const query = search.trim().toLocaleLowerCase("id-ID");
  if (!query) return [...rows];
  return rows.filter((row) =>
    row.project_name.toLocaleLowerCase("id-ID").includes(query),
  );
}
