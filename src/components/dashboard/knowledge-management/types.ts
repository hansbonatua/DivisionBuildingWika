import type { KnowledgeType } from "@/lib/knowledge-management/schema";

// Browser-facing DTOs mirror the snake_case API contract exactly. Keeping the
// HTTP names here avoids a second mapping layer in the client.

export type KnowledgeRecordDto = {
  id: string;
  project: {
    project_id: string;
    name: string;
    location: string;
    year: number;
  };
  knowledge_type: KnowledgeType;
  content: string;
  pics: Array<{ user_id: string; name: string; status: string }>;
  evidence: { name: string; url: string };
  version: number;
  created_by: { user_id: string; name: string };
  created_at: string;
  updated_by: { user_id: string; name: string } | null;
  updated_at: string;
};

export type KnowledgePicOptionDto = {
  user_id: string;
  name: string;
  status: string;
  position: string;
};

export type KnowledgeProjectOptionDto = {
  project_id: string;
  name: string;
  location: string;
  year: number;
};

export type KnowledgeProjectGroup = {
  project: KnowledgeRecordDto["project"];
  records: KnowledgeRecordDto[];
};

export const KNOWLEDGE_CONTENT_MAX = 20000;
export const KNOWLEDGE_EVIDENCE_NAME_MAX = 200;
export const KNOWLEDGE_EVIDENCE_URL_MAX = 2048;
export const EMPTY_VALUE = "—";

export function groupKnowledgeRecords(
  records: KnowledgeRecordDto[],
): KnowledgeProjectGroup[] {
  const groups: KnowledgeProjectGroup[] = [];
  const byProject = new Map<string, KnowledgeProjectGroup>();

  for (const record of records) {
    const projectId = record.project.project_id;
    const existing = byProject.get(projectId);
    if (existing) {
      existing.records.push(record);
      continue;
    }
    const group: KnowledgeProjectGroup = {
      project: record.project,
      records: [record],
    };
    byProject.set(projectId, group);
    groups.push(group);
  }

  return groups;
}

// Table filter state. A null dimension means "no filter"; the two dimensions
// are combined with AND, never OR.
export type KnowledgeFilters = {
  year: number | null;
  projectId: string | null;
};

export const EMPTY_KNOWLEDGE_FILTERS: KnowledgeFilters = {
  year: null,
  projectId: null,
};

// Pure and order-preserving: the API already returns the canonical order
// (year DESC, project ASC, created_at ASC), so filtering must never re-sort.
// The input array and its records are never mutated.
export function filterKnowledgeRecords(
  records: KnowledgeRecordDto[],
  filters: KnowledgeFilters,
): KnowledgeRecordDto[] {
  const { year, projectId } = filters;
  return records.filter((record) => {
    if (year !== null && record.project.year !== year) return false;
    if (projectId !== null && record.project.project_id !== projectId) return false;
    return true;
  });
}

// Years with at least one record, newest first. Years without records are
// deliberately absent: selecting one would always produce an empty table
// (Owner decision D-KM-ENH-02).
export function getAvailableYears(records: KnowledgeRecordDto[]): number[] {
  const years = new Set<number>();
  for (const record of records) {
    years.add(record.project.year);
  }
  return [...years].sort((a, b) => b - a);
}

// Unique projects present in the loaded records, sorted by name. This is the
// only source the filter may use: the project-options endpoint is Manage-only
// and capped at 50 rows, so it cannot serve read-only roles.
export function getAvailableProjects(
  records: KnowledgeRecordDto[],
): KnowledgeProjectOptionDto[] {
  const byId = new Map<string, KnowledgeProjectOptionDto>();
  for (const record of records) {
    const { project } = record;
    if (!byId.has(project.project_id)) {
      byId.set(project.project_id, { ...project });
    }
  }
  return [...byId.values()].sort(
    (a, b) =>
      a.name.localeCompare(b.name, "id") || a.project_id.localeCompare(b.project_id),
  );
}

export function formatKnowledgeDate(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_VALUE;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return EMPTY_VALUE;
  }
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function isKnowledgeUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function knowledgeLengthState(
  length: number,
  max: number,
): "normal" | "warning" | "over" {
  if (length > max) return "over";
  if (length >= max * 0.9) return "warning";
  return "normal";
}
