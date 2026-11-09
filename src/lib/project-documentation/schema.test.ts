import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSafePdocUrl,
  updateProjectDocumentationSchema,
} from "@/lib/project-documentation/schema";

const MAX_URL =
  "https://example.com/" + "a".repeat(2048 - "https://example.com/".length);

describe("PDOC update schema", () => {
  it("accepts a full payload and trims values", () => {
    const parsed = updateProjectDocumentationSchema.parse({
      week_1_url: " https://example.com/week-1 ",
      week_2_url: "http://example.com/week-2",
      week_3_url: null,
      week_4_url: "",
      week_5_url: "https://example.com/week-5",
      catatan: " Catatan project ",
    });

    assert.equal(parsed.week_1_url, "https://example.com/week-1");
    assert.equal(parsed.week_2_url, "http://example.com/week-2");
    assert.equal(parsed.week_3_url, null);
    assert.equal(parsed.week_4_url, null);
    assert.equal(parsed.week_5_url, "https://example.com/week-5");
    assert.equal(parsed.catatan, "Catatan project");
  });

  it("preserves omitted fields as undefined", () => {
    const parsed = updateProjectDocumentationSchema.parse({
      week_1_url: "https://example.com/week-1",
    });

    assert.equal(parsed.week_1_url, "https://example.com/week-1");
    assert.equal(parsed.week_2_url, undefined);
    assert.equal(parsed.week_3_url, undefined);
    assert.equal(parsed.week_4_url, undefined);
    assert.equal(parsed.week_5_url, undefined);
    assert.equal(parsed.catatan, undefined);
  });

  it("rejects an empty update body", () => {
    assert.equal(updateProjectDocumentationSchema.safeParse({}).success, false);
  });

  it("rejects unknown fields instead of stripping them", () => {
    assert.equal(
      updateProjectDocumentationSchema.safeParse({
        week_1_url: null,
        project_id: "11111111-1111-4111-8111-111111111111",
      }).success,
      false,
    );
  });

  it("rejects non-http(s) and relative URLs", () => {
    for (const value of [
      "ftp://example.com/file",
      "javascript:alert(1)",
      "/dashboard/project",
      "not a url",
    ]) {
      assert.equal(
        updateProjectDocumentationSchema.safeParse({ week_1_url: value }).success,
        false,
        value,
      );
    }
  });

  it("accepts a URL of exactly 2048 characters and rejects 2049", () => {
    assert.equal(
      updateProjectDocumentationSchema.safeParse({ week_1_url: MAX_URL }).success,
      true,
    );
    assert.equal(
      updateProjectDocumentationSchema.safeParse({
        week_1_url: MAX_URL + "a",
      }).success,
      false,
    );
  });

  it("enforces the 2000-character catatan limit", () => {
    assert.equal(
      updateProjectDocumentationSchema.safeParse({
        catatan: "c".repeat(2000),
      }).success,
      true,
    );
    assert.equal(
      updateProjectDocumentationSchema.safeParse({
        catatan: "c".repeat(2001),
      }).success,
      false,
    );
  });
});

describe("isSafePdocUrl", () => {
  it("accepts absolute http and https URLs", () => {
    assert.equal(isSafePdocUrl("http://example.com"), true);
    assert.equal(isSafePdocUrl("https://example.com/a?b=1"), true);
  });

  it("rejects malformed and non-http(s) URLs", () => {
    assert.equal(isSafePdocUrl("/dashboard"), false);
    assert.equal(isSafePdocUrl("javascript:alert(1)"), false);
    assert.equal(isSafePdocUrl("not a url"), false);
  });
});
