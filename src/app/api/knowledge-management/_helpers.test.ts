import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { KnowledgeValidationError } from "@/lib/knowledge-management/service";
import { createKnowledgeEntrySchema } from "@/lib/knowledge-management/schema";
import { parseExpectedVersion, validationErrorResponse } from "./_helpers";

describe("parseExpectedVersion", () => {
  it("accepts JSON integers and numeric query strings", () => {
    assert.equal(parseExpectedVersion(1), 1);
    assert.equal(parseExpectedVersion(42), 42);
    assert.equal(parseExpectedVersion("1"), 1);
    assert.equal(parseExpectedVersion(" 0042 "), 42);
  });

  it("rejects missing, zero, negative, fractional and non-numeric values", () => {
    for (const value of [
      undefined,
      null,
      0,
      -1,
      1.5,
      "1.5",
      "-1",
      "0",
      "abc",
      "",
      true,
      {},
      [],
    ]) {
      assert.throws(
        () => parseExpectedVersion(value),
        KnowledgeValidationError,
        `expected reject: ${String(value)}`,
      );
    }
  });
});

describe("validationErrorResponse", () => {
  it("returns the first specific Zod message instead of a generic label", async () => {
    const parsed = createKnowledgeEntrySchema.safeParse({
      project_id: "11111111-1111-4111-8111-111111111111",
      content: "a".repeat(20001),
      pic_ids: ["22222222-2222-4222-8222-222222222222"],
      evidence_name: "Laporan",
      evidence_url: "https://example.com/evaluasi",
    });
    assert.equal(parsed.success, false);
    if (parsed.success) return;

    const response = validationErrorResponse(parsed.error);
    assert.equal(response.status, 400);
    const body = (await response.json()) as {
      error: { message: string; details: Record<string, unknown> };
    };
    assert.match(body.error.message, /20\.000/);
    assert.equal(Array.isArray(body.error.details.content), true);
  });
});
