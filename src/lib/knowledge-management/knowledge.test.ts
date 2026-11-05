import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evidenceItemSchema,
  isSafeEvidenceUrl,
  knowledgeTypeFromSlug,
  upsertKnowledgeEntrySchema,
  KNOWLEDGE_TYPE_SLUGS,
  KNOWLEDGE_TYPES,
} from "@/lib/knowledge-management/schema";
import {
  canManageKnowledgeManagement,
  canViewKnowledgeManagement,
} from "@/lib/knowledge-management/access";
import { hasStaleTimestamp } from "@/lib/knowledge-management/conflict";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const PIC_ID = "22222222-2222-4222-8222-222222222222";
const PIC_ID_2 = "33333333-3333-4333-8333-333333333333";

// Inline record payload: content + PIC only. Evidence is a separate contract.
function payload(overrides: Record<string, unknown> = {}) {
  return {
    projectId: PROJECT_ID,
    knowledgeType: "lesson_learn",
    content: "Ringkasan pekerjaan.",
    picIds: [PIC_ID],
    ...overrides,
  };
}

describe("knowledge evidence URL safety", () => {
  it("accepts absolute http and https URLs", () => {
    assert.equal(isSafeEvidenceUrl("https://example.com/evaluasi"), true);
    assert.equal(isSafeEvidenceUrl("http://example.com/foto"), true);
    assert.equal(isSafeEvidenceUrl("  https://example.com/a?b=1#c  "), true);
  });

  it("rejects unsafe schemes and non-absolute values", () => {
    for (const value of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "blob:https://example.com/x",
      "ftp://example.com/file",
      "//evil.example.com",
      "example.com",
      "/relative/path",
      "",
    ]) {
      assert.equal(isSafeEvidenceUrl(value), false, `expected reject: ${value}`);
    }
  });
});

describe("knowledge evidence row contract", () => {
  it("accepts a valid row and trims both fields", () => {
    const parsed = evidenceItemSchema.safeParse({
      name: "  Laporan evaluasi  ",
      url: "  https://example.com/evaluasi  ",
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.name, "Laporan evaluasi");
      assert.equal(parsed.data.url, "https://example.com/evaluasi");
    }
  });

  it("rejects empty fields, unsafe URLs and unknown keys", () => {
    const invalid = [
      { name: "", url: "https://example.com/a" },
      { name: "Laporan", url: "   " },
      { name: "Laporan", url: "javascript:alert(1)" },
      { name: "Laporan", url: "/relative" },
      { name: "Laporan", url: "https://example.com/a", extra: true },
    ];
    for (const candidate of invalid) {
      assert.equal(evidenceItemSchema.safeParse(candidate).success, false);
    }
  });
});

describe("knowledge content contract", () => {
  it("preserves paragraphs, bullets, numbered lists and line breaks", () => {
    const content =
      "Paragraf pertama.\n\n- poin manual\n- poin kedua\n\n1. langkah satu\n2. langkah dua";
    const parsed = upsertKnowledgeEntrySchema.safeParse(payload({ content }));
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.content, content);
      assert.ok(parsed.data.content.includes("\n\n- poin manual"));
      assert.ok(parsed.data.content.includes("1. langkah satu"));
    }
  });

  it("rejects empty or whitespace-only content", () => {
    assert.equal(upsertKnowledgeEntrySchema.safeParse(payload({ content: "" })).success, false);
    assert.equal(upsertKnowledgeEntrySchema.safeParse(payload({ content: "   " })).success, false);
  });

  it("rejects unknown fields and invalid project/PIC ids", () => {
    assert.equal(
      upsertKnowledgeEntrySchema.safeParse(payload({ projectName: "x" })).success,
      false,
    );
    assert.equal(
      upsertKnowledgeEntrySchema.safeParse(payload({ projectId: "not-a-uuid" })).success,
      false,
    );
    assert.equal(
      upsertKnowledgeEntrySchema.safeParse(payload({ picIds: ["not-a-uuid"] })).success,
      false,
    );
  });

  it("accepts one of the three knowledge types only", () => {
    assert.equal(
      upsertKnowledgeEntrySchema.safeParse(payload({ knowledgeType: "lesson_learn" })).success,
      true,
    );
    assert.equal(
      upsertKnowledgeEntrySchema.safeParse(payload({ knowledgeType: "other" })).success,
      false,
    );
    assert.equal(
      upsertKnowledgeEntrySchema.safeParse(payload({ picIds: [PIC_ID, PIC_ID_2] })).success,
      true,
    );
  });
});

describe("knowledge type slugs", () => {
  it("maps every canonical type to a unique slug and back", () => {
    const slugs = new Set<string>();
    for (const type of KNOWLEDGE_TYPES) {
      const slug = KNOWLEDGE_TYPE_SLUGS[type];
      slugs.add(slug);
      assert.equal(knowledgeTypeFromSlug(slug), type);
    }
    assert.equal(slugs.size, KNOWLEDGE_TYPES.length);
    assert.equal(knowledgeTypeFromSlug("unknown"), null);
  });
});

describe("knowledge permissions", () => {
  it("grants Admin and Head Office manage access", () => {
    assert.equal(canManageKnowledgeManagement("Admin"), true);
    assert.equal(canManageKnowledgeManagement("Head Office"), true);
  });

  it("keeps Management and Project read-only", () => {
    for (const role of ["Management", "Project"]) {
      assert.equal(canViewKnowledgeManagement(role), true);
      assert.equal(canManageKnowledgeManagement(role), false);
    }
  });

  it("denies unknown roles entirely", () => {
    assert.equal(canViewKnowledgeManagement("Guest"), false);
    assert.equal(canManageKnowledgeManagement("Guest"), false);
  });
});

describe("PIC minimum contract", () => {
  it("rejects a payload without a PIC list", () => {
    const withoutPics = {
      projectId: PROJECT_ID,
      knowledgeType: "lesson_learn",
      content: "Ringkasan pekerjaan.",
    };
    assert.equal(upsertKnowledgeEntrySchema.safeParse(withoutPics).success, false);
  });

  it("rejects an explicit empty PIC list", () => {
    assert.equal(
      upsertKnowledgeEntrySchema.safeParse(payload({ picIds: [] })).success,
      false,
    );
  });

  it("accepts multiple PICs and an explicit empty evidence state", () => {
    const parsed = upsertKnowledgeEntrySchema.safeParse(
      payload({ picIds: [PIC_ID, PIC_ID_2] }),
    );
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.deepEqual(parsed.data.picIds, [PIC_ID, PIC_ID_2]);
    }
  });
});

describe("evidence is managed outside the record payload", () => {
  it("rejects an evidence key inside the inline content/PIC payload", () => {
    assert.equal(
      upsertKnowledgeEntrySchema.safeParse(
        payload({ evidence: [{ name: "Laporan", url: "https://example.com/a" }] }),
      ).success,
      false,
    );
  });
});

describe("KM-03 optimistic concurrency token", () => {
  const iso = "2026-11-04T10:00:00.000000Z";

  it("treats an equal exact timestamp as fresh", () => {
    assert.equal(hasStaleTimestamp(iso, iso), false);
  });

  it("treats a newer stored timestamp as stale", () => {
    assert.equal(hasStaleTimestamp("2026-11-04T10:00:01.000000Z", iso), true);
  });

  it("distinguishes tokens inside the same millisecond", () => {
    const first = "2026-11-04T10:00:00.123400Z";
    const second = "2026-11-04T10:00:00.123900Z";
    assert.equal(hasStaleTimestamp(first, first), false);
    assert.equal(hasStaleTimestamp(second, first), true);
  });

  it("rejects a token that differs by exactly one microsecond", () => {
    const first = "2026-11-04T10:00:00.123456Z";
    const next = "2026-11-04T10:00:00.123457Z";
    assert.equal(hasStaleTimestamp(next, first), true);
    assert.equal(hasStaleTimestamp(next, next), false);
  });

  it("treats a missing token as stale", () => {
    assert.equal(hasStaleTimestamp(iso, null), true);
  });

  it("treats a different token as stale", () => {
    assert.equal(hasStaleTimestamp(iso, "not-a-date"), true);
  });

  it("accepts ISO or null tokens and rejects invalid ones", () => {
    const withToken = (expectedUpdatedAt: unknown) =>
      upsertKnowledgeEntrySchema.safeParse(payload({ expectedUpdatedAt })).success;
    assert.equal(withToken(iso), true);
    assert.equal(withToken(null), true);
    assert.equal(withToken(undefined), true);
    assert.equal(withToken("nope"), false);
    assert.equal(withToken(123), false);
  });
});
