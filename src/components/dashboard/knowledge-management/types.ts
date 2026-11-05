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
