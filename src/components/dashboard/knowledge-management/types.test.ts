import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
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
