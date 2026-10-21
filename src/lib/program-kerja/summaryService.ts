import { canViewProgramKerjaSummary } from "@/lib/program-kerja/access";
import {
  listAssignedPicUsers,
  listGroups,
  listProgramRows,
  type ProgramKerjaListRow,
} from "@/lib/program-kerja/repository";
import {
  aggregateSummary,
  type SummaryAggregate,
  type SummaryProgramInput,
} from "@/lib/program-kerja/summary";
import {
  ProgramKerjaForbiddenError,
  type ProgramKerjaActor,
} from "@/lib/program-kerja/service";
import type { ProgramKerjaSummaryQuery } from "@/lib/program-kerja/schema";

// Server-only Summary Report V1 orchestration. Route → service → repository.
// The service owns authorization, filter resolution and dataset slicing; all
// business aggregation lives in the pure summary module.

export type ProgramKerjaSummaryFilters = {
  year: number;
  groupId: string | null;
  unit: NonNullable<ProgramKerjaSummaryQuery["unit"]> | null;
  picId: string | null;
};

export type ProgramKerjaSummaryOptions = {
  years: number[];
  groups: Array<{ id: string; name: string }>;
  pics: Array<{ id: string; name: string }>;
};

export type ProgramKerjaSummaryResponse = SummaryAggregate & {
  filters: ProgramKerjaSummaryFilters;
  options: ProgramKerjaSummaryOptions;
};

// Prefer the current year; when the dataset has no rows for it, fall back to
// the newest year actually present. Never hardcode a calendar year.
export function resolveDefaultSummaryYear(
  availableYears: readonly number[],
  now: Date = new Date(),
): number {
  const currentYear = now.getFullYear();
  if (availableYears.includes(currentYear)) {
    return currentYear;
  }
  return availableYears.length > 0 ? Math.max(...availableYears) : currentYear;
}

function assertSummaryAccess(actor: ProgramKerjaActor): void {
  if (actor.status !== "active") {
    throw new ProgramKerjaForbiddenError();
  }
  if (!canViewProgramKerjaSummary(actor.role)) {
    throw new ProgramKerjaForbiddenError();
  }
}

function toSummaryInput(row: ProgramKerjaListRow): SummaryProgramInput {
  return {
    id: row.program.id,
    name: row.program.name,
    unit: row.program.unit,
    startMonth: row.program.startMonth,
    endMonth: row.program.endMonth,
    parameter: row.program.parameter,
    monitor: row.program.monitor,
    group: row.group,
    monthly: row.monthly.map((month) => ({
      month: month.month,
      raValue: month.raValue,
      riValue: month.riValue,
    })),
    pics: row.pics.map((pic) => ({ id: pic.id, name: pic.name })),
  };
}

export async function getProgramKerjaSummary(
  actor: ProgramKerjaActor,
  query: ProgramKerjaSummaryQuery,
  now: Date = new Date(),
): Promise<ProgramKerjaSummaryResponse> {
  assertSummaryAccess(actor);

  // Constant query count: programs (+monthly/pics/groups batched), all
  // reference groups, and assigned-PIC options. No N+1.
  const [rows, groupRows, picRows] = await Promise.all([
    listProgramRows(),
    listGroups(),
    listAssignedPicUsers(),
  ]);

  const years = [...new Set(rows.map((row) => row.program.year))].sort((a, b) => b - a);
  const year = query.year ?? resolveDefaultSummaryYear(years, now);

  // Single filtered dataset shared by KPI, status, groups, PICs, monthly
  // trend and the program table.
  const filtered = rows.filter((row) => {
    if (row.program.year !== year) {
      return false;
    }
    if (query.groupId !== undefined && row.program.groupId !== query.groupId) {
      return false;
    }
    if (query.unit !== undefined && row.program.unit !== query.unit) {
      return false;
    }
    if (query.picId !== undefined && !row.pics.some((pic) => pic.id === query.picId)) {
      return false;
    }
    return true;
  });

  const aggregate = aggregateSummary(
    filtered.map(toSummaryInput),
    query.unit ?? null,
  );

  return {
    filters: {
      year,
      groupId: query.groupId ?? null,
      unit: query.unit ?? null,
      picId: query.picId ?? null,
    },
    options: {
      years,
      groups: groupRows.map((group) => ({ id: group.id, name: group.name })),
      pics: picRows.map((pic) => ({ id: pic.id, name: pic.name })),
    },
    ...aggregate,
  };
}
