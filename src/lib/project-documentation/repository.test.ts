import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildProjectDocumentationWrite,
  type ProjectDocumentationRecord,
} from "@/lib/project-documentation/repository";

const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const OLD = new Date("2025-01-01T00:00:00.000Z");
const NOW = new Date("2026-01-01T00:00:00.000Z");

function existing(
  overrides: Partial<ProjectDocumentationRecord> = {},
): ProjectDocumentationRecord {
  return {
    id: "doc-1",
    projectId: "22222222-2222-4222-8222-222222222222",
    year: 2026,
    month: 1,
    week1Url: null,
    week1UpdatedBy: null,
    week1UpdatedAt: null,
    week2Url: null,
    week2UpdatedBy: null,
    week2UpdatedAt: null,
    week3Url: null,
    week3UpdatedBy: null,
    week3UpdatedAt: null,
    week4Url: null,
    week4UpdatedBy: null,
    week4UpdatedAt: null,
    week5Url: null,
    week5UpdatedBy: null,
    week5UpdatedAt: null,
    catatan: null,
    createdBy: ACTOR_ID,
    updatedBy: null,
    createdAt: OLD,
    updatedAt: OLD,
    ...overrides,
  };
}

describe("PDOC write transition", () => {
  it("creates a row and audits every non-null week", () => {
    const plan = buildProjectDocumentationWrite(
      null,
      {
        week1Url: "https://example.com/week-1",
        week3Url: "https://example.com/week-3",
        catatan: "Catatan",
      },
      ACTOR_ID,
      NOW,
    );

    assert.equal(plan.changed, true);
    assert.equal(plan.values.week1Url, "https://example.com/week-1");
    assert.equal(plan.values.week1UpdatedBy, ACTOR_ID);
    assert.equal(plan.values.week1UpdatedAt, NOW);
    assert.equal(plan.values.week2Url, null);
    assert.equal(plan.values.week2UpdatedBy, null);
    assert.equal(plan.values.week2UpdatedAt, null);
    assert.equal(plan.values.week3UpdatedBy, ACTOR_ID);
    assert.equal(plan.values.week3UpdatedAt, NOW);
    assert.equal(plan.values.catatan, "Catatan");
    assert.equal(plan.values.updatedBy, ACTOR_ID);
    assert.equal(plan.values.updatedAt, NOW);
  });

  it("does not move audit metadata when the same URL is sent", () => {
    const current = existing({
      week1Url: "https://example.com/week-1",
      week1UpdatedBy: "uploader-1",
      week1UpdatedAt: OLD,
    });

    const plan = buildProjectDocumentationWrite(
      current,
      { week1Url: "https://example.com/week-1" },
      ACTOR_ID,
      NOW,
    );

    assert.equal(plan.changed, false);
    assert.equal(plan.values.week1Url, "https://example.com/week-1");
    assert.equal(plan.values.week1UpdatedBy, "uploader-1");
    assert.equal(plan.values.week1UpdatedAt, OLD);
  });

  it("updates only the changed week and preserves the others", () => {
    const current = existing({
      week1Url: "https://example.com/week-1",
      week1UpdatedBy: "uploader-1",
      week1UpdatedAt: OLD,
      week2Url: "https://example.com/week-2",
      week2UpdatedBy: "uploader-2",
      week2UpdatedAt: OLD,
    });

    const plan = buildProjectDocumentationWrite(
      current,
      { week1Url: "https://example.com/week-1-new" },
      ACTOR_ID,
      NOW,
    );

    assert.equal(plan.changed, true);
    assert.equal(plan.values.week1Url, "https://example.com/week-1-new");
    assert.equal(plan.values.week1UpdatedBy, ACTOR_ID);
    assert.equal(plan.values.week1UpdatedAt, NOW);
    assert.equal(plan.values.week2Url, "https://example.com/week-2");
    assert.equal(plan.values.week2UpdatedBy, "uploader-2");
    assert.equal(plan.values.week2UpdatedAt, OLD);
  });

  it("clears the URL and its audit pair when the URL is removed", () => {
    const current = existing({
      week1Url: "https://example.com/week-1",
      week1UpdatedBy: "uploader-1",
      week1UpdatedAt: OLD,
    });

    const plan = buildProjectDocumentationWrite(
      current,
      { week1Url: null },
      ACTOR_ID,
      NOW,
    );

    assert.equal(plan.changed, true);
    assert.equal(plan.values.week1Url, null);
    assert.equal(plan.values.week1UpdatedBy, null);
    assert.equal(plan.values.week1UpdatedAt, null);
  });

  it("updates row audit when only catatan changes", () => {
    const current = existing({
      week1Url: "https://example.com/week-1",
      week1UpdatedBy: "uploader-1",
      week1UpdatedAt: OLD,
    });

    const plan = buildProjectDocumentationWrite(
      current,
      { catatan: "Catatan baru" },
      ACTOR_ID,
      NOW,
    );

    assert.equal(plan.changed, true);
    assert.equal(plan.values.catatan, "Catatan baru");
    assert.equal(plan.values.week1UpdatedBy, "uploader-1");
    assert.equal(plan.values.week1UpdatedAt, OLD);
    assert.equal(plan.values.updatedBy, ACTOR_ID);
    assert.equal(plan.values.updatedAt, NOW);
  });

  it("treats an omitted field as untouched and an empty save as a no-op", () => {
    const current = existing({
      week1Url: "https://example.com/week-1",
      week1UpdatedBy: "uploader-1",
      week1UpdatedAt: OLD,
      catatan: "Lama",
    });

    const plan = buildProjectDocumentationWrite(current, {}, ACTOR_ID, NOW);

    assert.equal(plan.changed, false);
    assert.equal(plan.values.week1Url, "https://example.com/week-1");
    assert.equal(plan.values.week1UpdatedBy, "uploader-1");
    assert.equal(plan.values.week1UpdatedAt, OLD);
    assert.equal(plan.values.catatan, "Lama");
  });
});
