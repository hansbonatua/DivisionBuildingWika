import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createKnowledgeEntrySchema,
  evidenceItemSchema,
  isSafeEvidenceUrl,
  knowledgeTypeFromSlug,
  updateKnowledgeEntrySchema,
  KNOWLEDGE_TYPE_SLUGS,
  KNOWLEDGE_TYPES,
} from "@/lib/knowledge-management/schema";
import {
  canManageKnowledgeManagement,
  canViewKnowledgeManagement,
  isEligibleKnowledgePic,
} from "@/lib/knowledge-management/access";
import {
  KnowledgeVersionConflictError,
  hasVersionConflict,
} from "@/lib/knowledge-management/conflict";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const PIC_ID = "22222222-2222-4222-8222-222222222222";
const PIC_ID_2 = "33333333-3333-4333-8333-333333333333";

function createPayload(overrides: Record<string, unknown> = {}) {
  return {
    project_id: PROJECT_ID,
    content: "Ringkasan pekerjaan.",
    pic_ids: [PIC_ID],
    evidence_name: "Laporan evaluasi",
    evidence_url: "https://example.com/evaluasi",
    ...overrides,
  };
}

function updatePayload(overrides: Record<string, unknown> = {}) {
  return {
    content: "Ringkasan pekerjaan terbaru.",
    pic_ids: [PIC_ID],
    evidence_name: "Laporan evaluasi terbaru",
    evidence_url: "https://example.com/evaluasi-terbaru",
    expected_version: 1,
    ...overrides,
  };
}

function uuidFor(value: number): string {
  return `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
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

describe("knowledge create contract", () => {
  it("accepts and trims a valid aggregate payload", () => {
    const parsed = createKnowledgeEntrySchema.safeParse(
      createPayload({
        content: "  Ringkasan pekerjaan.  ",
        evidence_name: "  Laporan evaluasi  ",
        evidence_url: "  https://example.com/evaluasi  ",
      }),
    );
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.content, "Ringkasan pekerjaan.");
      assert.equal(parsed.data.evidence_name, "Laporan evaluasi");
      assert.equal(parsed.data.evidence_url, "https://example.com/evaluasi");
    }
  });

  it("enforces content 20.000 / 20.001", () => {
    const atLimit = createKnowledgeEntrySchema.safeParse(
      createPayload({ content: "a".repeat(20000) }),
    );
    const overLimit = createKnowledgeEntrySchema.safeParse(
      createPayload({ content: "a".repeat(20001) }),
    );
    assert.equal(atLimit.success, true);
    assert.equal(overLimit.success, false);
    if (!overLimit.success) {
      assert.match(overLimit.error.issues[0]?.message ?? "", /20\.000/);
    }
  });

  it("enforces evidence name 200 / 201", () => {
    assert.equal(
      createKnowledgeEntrySchema.safeParse(
        createPayload({ evidence_name: "n".repeat(200) }),
      ).success,
      true,
    );
    const overLimit = createKnowledgeEntrySchema.safeParse(
      createPayload({ evidence_name: "n".repeat(201) }),
    );
    assert.equal(overLimit.success, false);
    if (!overLimit.success) {
      assert.match(overLimit.error.issues[0]?.message ?? "", /200/);
    }
  });

  it("enforces evidence URL 2.048 / 2.049", () => {
    const base = "https://example.com/"; // 20 chars
    assert.equal(
      createKnowledgeEntrySchema.safeParse(
        createPayload({ evidence_url: base + "a".repeat(2028) }),
      ).success,
      true,
    );
    const overLimit = createKnowledgeEntrySchema.safeParse(
      createPayload({ evidence_url: base + "a".repeat(2029) }),
    );
    assert.equal(overLimit.success, false);
    if (!overLimit.success) {
      assert.match(overLimit.error.issues[0]?.message ?? "", /2\.048/);
    }
  });

  it("requires at least one PIC and has no maximum PIC count", () => {
    assert.equal(
      createKnowledgeEntrySchema.safeParse(createPayload({ pic_ids: [] })).success,
      false,
    );
    assert.equal(
      createKnowledgeEntrySchema.safeParse(
        createPayload({
          pic_ids: [PIC_ID, PIC_ID_2],
        }),
      ).success,
      true,
    );
    assert.equal(
      createKnowledgeEntrySchema.safeParse(
        createPayload({
          pic_ids: Array.from({ length: 51 }, (_, index) => uuidFor(index + 1)),
        }),
      ).success,
      true,
    );
  });

  it("rejects unknown fields, invalid project IDs and unsafe URLs", () => {
    assert.equal(
      createKnowledgeEntrySchema.safeParse(createPayload({ projectId: PROJECT_ID }))
        .success,
      false,
    );
    assert.equal(
      createKnowledgeEntrySchema.safeParse(createPayload({ project_id: "not-a-uuid" }))
        .success,
      false,
    );
    assert.equal(
      createKnowledgeEntrySchema.safeParse(
        createPayload({ evidence_url: "javascript:alert(1)" }),
      ).success,
      false,
    );
  });
});

describe("knowledge update contract", () => {
  it("accepts the V2 update body with expected_version", () => {
    assert.equal(updateKnowledgeEntrySchema.safeParse(updatePayload()).success, true);
  });

  it("rejects project_id, projectId and knowledge_type", () => {
    assert.equal(
      updateKnowledgeEntrySchema.safeParse(
        updatePayload({ project_id: PROJECT_ID }),
      ).success,
      false,
    );
    assert.equal(
      updateKnowledgeEntrySchema.safeParse(
        updatePayload({ projectId: PROJECT_ID }),
      ).success,
      false,
    );
    assert.equal(
      updateKnowledgeEntrySchema.safeParse(
        updatePayload({ knowledge_type: "lesson_learn" }),
      ).success,
      false,
    );
  });

  it("requires an integer expected_version >= 1", () => {
    for (const value of [undefined, null, 0, -1, 1.5, "1"]) {
      assert.equal(
        updateKnowledgeEntrySchema.safeParse(
          updatePayload({ expected_version: value }),
        ).success,
        false,
        `expected reject: ${String(value)}`,
      );
    }
    assert.equal(
      updateKnowledgeEntrySchema.safeParse(
        updatePayload({ expected_version: 2 }),
      ).success,
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

  it("allows active and suspended Head Office PICs equally", () => {
    assert.equal(
      isEligibleKnowledgePic({ role: "Head Office", status: "active" }),
      true,
    );
    assert.equal(
      isEligibleKnowledgePic({ role: "Head Office", status: "suspended" }),
      true,
    );
  });

  it("rejects PICs whose role is not Head Office", () => {
    for (const role of ["Admin", "Management", "Project", "Guest"]) {
      assert.equal(
        isEligibleKnowledgePic({ role, status: "active" }),
        false,
        `expected reject: ${role}`,
      );
    }
  });
});

describe("evidence item contract", () => {
  it("accepts a valid row and rejects unsafe or unknown values", () => {
    assert.equal(
      evidenceItemSchema.safeParse({
        name: "Laporan",
        url: "https://example.com/a",
      }).success,
      true,
    );
    assert.equal(
      evidenceItemSchema.safeParse({
        name: "Laporan",
        url: "javascript:alert(1)",
      }).success,
      false,
    );
    assert.equal(
      evidenceItemSchema.safeParse({
        name: "Laporan",
        url: "https://example.com/a",
        extra: true,
      }).success,
      false,
    );
  });
});

describe("version-based optimistic concurrency", () => {
  it("treats an equal version as fresh and a different version as stale", () => {
    assert.equal(hasVersionConflict(3, 3), false);
    assert.equal(hasVersionConflict(4, 3), true);
    assert.equal(hasVersionConflict(2, 3), true);
  });

  it("exposes a dedicated conflict error with a stable code", () => {
    const error = new KnowledgeVersionConflictError();
    assert.equal(error.name, "KnowledgeVersionConflictError");
    assert.equal(error.code, "KNOWLEDGE_VERSION_CONFLICT");
    assert.match(error.message, /Muat ulang data terbaru/);
  });
});
