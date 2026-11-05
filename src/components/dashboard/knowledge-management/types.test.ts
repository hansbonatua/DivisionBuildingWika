import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_KNOWLEDGE_FILTERS,
  filterKnowledgeRecords,
  getAvailableProjects,
  getAvailableYears,
  groupKnowledgeRecords,
  isKnowledgeUrl,
  knowledgeLengthState,
  type KnowledgeRecordDto,
} from "./types";

function record(projectId: string, id: string): KnowledgeRecordDto {
  return {
    id,
    project: {
      project_id: projectId,
      name: `Project ${projectId}`,
      location: "Jakarta",
      year: 2026,
    },
    knowledge_type: "lesson_learn",
    content: `Content ${id}`,
    pics: [{ user_id: "pic-1", name: "PIC", status: "active" }],
    evidence: { name: "Evidence", url: "https://example.com/evidence" },
    version: 1,
    created_by: { user_id: "creator-1", name: "Creator" },
    created_at: "2026-11-05T01:00:00.000000Z",
    updated_by: null,
    updated_at: "2026-11-05T01:00:00.000000Z",
  };
}

describe("knowledge table grouping", () => {
  it("groups consecutive records by project without losing order", () => {
    const groups = groupKnowledgeRecords([
      record("project-a", "entry-1"),
      record("project-a", "entry-2"),
      record("project-b", "entry-3"),
      record("project-a", "entry-4"),
    ]);

    assert.equal(groups.length, 2);
    assert.equal(groups[0].project.project_id, "project-a");
    assert.deepEqual(
      groups[0].records.map((item) => item.id),
      ["entry-1", "entry-2", "entry-4"],
    );
    assert.equal(groups[1].project.project_id, "project-b");
    assert.equal(groups[1].records.length, 1);
  });

  it("returns no groups for an empty list", () => {
    assert.deepEqual(groupKnowledgeRecords([]), []);
  });
});

describe("knowledge form helpers", () => {
  it("classifies length counters at the warning and over boundaries", () => {
    assert.equal(knowledgeLengthState(10, 100), "normal");
    assert.equal(knowledgeLengthState(90, 100), "warning");
    assert.equal(knowledgeLengthState(100, 100), "warning");
    assert.equal(knowledgeLengthState(101, 100), "over");
  });

  it("accepts only absolute http and https evidence URLs", () => {
    assert.equal(isKnowledgeUrl("https://example.com/evidence"), true);
    assert.equal(isKnowledgeUrl("http://example.com/evidence"), true);
    assert.equal(isKnowledgeUrl("javascript:alert(1)"), false);
    assert.equal(isKnowledgeUrl("/relative/path"), false);
  });
});

function recordWith(
  projectId: string,
  id: string,
  options: { year?: number; projectName?: string } = {},
): KnowledgeRecordDto {
  const base = record(projectId, id);
  return {
    ...base,
    project: {
      ...base.project,
      year: options.year ?? base.project.year,
      name: options.projectName ?? base.project.name,
    },
  };
}

describe("knowledge filters", () => {
  it("returns every record for empty filters without mutating the input", () => {
    const records = [
      recordWith("project-a", "entry-1", { year: 2025 }),
      recordWith("project-b", "entry-2", { year: 2026 }),
    ];
    const snapshot = JSON.stringify(records);

    const filtered = filterKnowledgeRecords(records, EMPTY_KNOWLEDGE_FILTERS);

    assert.deepEqual(
      filtered.map((item) => item.id),
      ["entry-1", "entry-2"],
    );
    assert.equal(JSON.stringify(records), snapshot);
  });

  it("filters by year only and preserves the server order", () => {
    const records = [
      recordWith("project-a", "entry-1", { year: 2026 }),
      recordWith("project-b", "entry-2", { year: 2025 }),
      recordWith("project-c", "entry-3", { year: 2026 }),
    ];

    const filtered = filterKnowledgeRecords(records, {
      year: 2026,
      projectId: null,
    });

    assert.deepEqual(
      filtered.map((item) => item.id),
      ["entry-1", "entry-3"],
    );
  });

  it("filters by project id only", () => {
    const records = [
      recordWith("project-a", "entry-1"),
      recordWith("project-b", "entry-2"),
      recordWith("project-a", "entry-3"),
    ];

    const filtered = filterKnowledgeRecords(records, {
      year: null,
      projectId: "project-a",
    });

    assert.deepEqual(
      filtered.map((item) => item.id),
      ["entry-1", "entry-3"],
    );
  });

  it("combines year and project with AND", () => {
    const records = [
      recordWith("project-a", "entry-1", { year: 2026 }),
      recordWith("project-a", "entry-2", { year: 2025 }),
      recordWith("project-b", "entry-3", { year: 2026 }),
    ];

    const filtered = filterKnowledgeRecords(records, {
      year: 2026,
      projectId: "project-a",
    });

    assert.deepEqual(
      filtered.map((item) => item.id),
      ["entry-1"],
    );
  });

  it("returns an empty list when no record matches", () => {
    const records = [recordWith("project-a", "entry-1", { year: 2025 })];

    const filtered = filterKnowledgeRecords(records, {
      year: 2024,
      projectId: null,
    });

    assert.deepEqual(filtered, []);
    assert.equal(records.length, 1);
  });

  it("returns a new array instead of mutating the source", () => {
    const records = [recordWith("project-a", "entry-1", { year: 2026 })];
    const filtered = filterKnowledgeRecords(records, {
      year: 2026,
      projectId: null,
    });

    assert.notEqual(filtered, records);
    assert.deepEqual(records, [recordWith("project-a", "entry-1", { year: 2026 })]);
  });
});

describe("knowledge filter options", () => {
  it("lists unique years newest first", () => {
    const records = [
      recordWith("project-a", "entry-1", { year: 2025 }),
      recordWith("project-b", "entry-2", { year: 2026 }),
      recordWith("project-c", "entry-3", { year: 2025 }),
      recordWith("project-d", "entry-4", { year: 2024 }),
    ];

    assert.deepEqual(getAvailableYears(records), [2026, 2025, 2024]);
  });

  it("returns no years for an empty list", () => {
    assert.deepEqual(getAvailableYears([]), []);
  });

  it("lists each project once, sorted by name", () => {
    const records = [
      recordWith("project-b", "entry-1", { projectName: "Beta Tower" }),
      recordWith("project-a", "entry-2", { projectName: "Alpha Tower" }),
      recordWith("project-b", "entry-3", { projectName: "Beta Tower" }),
    ];

    const projects = getAvailableProjects(records);

    assert.deepEqual(
      projects.map((project) => project.project_id),
      ["project-a", "project-b"],
    );
    assert.deepEqual(
      projects.map((project) => project.name),
      ["Alpha Tower", "Beta Tower"],
    );
  });

  it("returns no projects for an empty list", () => {
    assert.deepEqual(getAvailableProjects([]), []);
  });
});

describe("knowledge grouping after filter", () => {
  it("re-counts rowspan from the filtered records only", () => {
    const records = [
      recordWith("project-a", "entry-1", { year: 2026 }),
      recordWith("project-a", "entry-2", { year: 2026 }),
      recordWith("project-b", "entry-3", { year: 2025 }),
      recordWith("project-b", "entry-4", { year: 2025 }),
    ];

    const filtered = filterKnowledgeRecords(records, {
      year: 2026,
      projectId: null,
    });
    const groups = groupKnowledgeRecords(filtered);

    assert.equal(groups.length, 1);
    assert.equal(groups[0]?.records.length, 2);
    assert.equal(groups[0]?.project.project_id, "project-a");
  });

  it("keeps one row of rowspan for a single remaining record", () => {
    const records = [
      recordWith("project-a", "entry-1", { year: 2026 }),
      recordWith("project-b", "entry-2", { year: 2026 }),
    ];

    const filtered = filterKnowledgeRecords(records, {
      year: null,
      projectId: "project-b",
    });
    const groups = groupKnowledgeRecords(filtered);

    assert.equal(groups.length, 1);
    assert.equal(groups[0]?.records.length, 1);
    assert.equal(groups[0]?.records[0]?.id, "entry-2");
  });
});
