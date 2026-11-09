import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CalculationSheetForbiddenError,
  CalculationSheetValidationError,
  assertManageAccess,
  assertViewAccess,
  canManageCalculationSheet,
  canViewCalculationSheet,
  isEligibleCalculationSheetPic,
  normalizeEvidenceUrl,
  normalizeKode,
  normalizeNama,
  normalizeOptionalText,
  type CalculationSheetActor,
} from "@/lib/calculation-sheet-template/service";

function actor(role: string, status = "active"): CalculationSheetActor {
  return { id: "user-1", role, status };
}

describe("CST normalization", () => {
  it("trims and uppercases kode", () => {
    assert.equal(normalizeKode("  ars-01 "), "ARS-01");
  });

  it("rejects empty and over-long kode", () => {
    assert.throws(() => normalizeKode("   "), CalculationSheetValidationError);
    assert.throws(() => normalizeKode("K".repeat(31)), CalculationSheetValidationError);
  });

  it("trims nama and rejects empty/over-long values", () => {
    assert.equal(normalizeNama("  Nama  "), "Nama");
    assert.throws(() => normalizeNama("  "), CalculationSheetValidationError);
    assert.throws(
      () => normalizeNama("N".repeat(201)),
      CalculationSheetValidationError,
    );
  });

  it("normalizes optional text to NULL and enforces the limit", () => {
    assert.equal(normalizeOptionalText("   ", 2000, "Catatan"), null);
    assert.equal(normalizeOptionalText(" isi ", 2000, "Catatan"), "isi");
    assert.throws(
      () => normalizeOptionalText("x".repeat(2001), 2000, "Catatan"),
      CalculationSheetValidationError,
    );
  });

  it("normalizes evidence URL to NULL and rejects unsafe values", () => {
    assert.equal(normalizeEvidenceUrl("   "), null);
    assert.equal(normalizeEvidenceUrl(null), null);
    assert.equal(
      normalizeEvidenceUrl(" https://example.com/a "),
      "https://example.com/a",
    );
    assert.throws(
      () => normalizeEvidenceUrl("ftp://example.com"),
      CalculationSheetValidationError,
    );
    assert.throws(
      () => normalizeEvidenceUrl("https://" + "a".repeat(2100)),
      CalculationSheetValidationError,
    );
  });
});

describe("CST PIC eligibility", () => {
  it("accepts every Head Office user, including suspended", () => {
    assert.equal(
      isEligibleCalculationSheetPic({ role: "Head Office", status: "active" }),
      true,
    );
    assert.equal(
      isEligibleCalculationSheetPic({ role: "Head Office", status: "suspended" }),
      true,
    );
  });

  it("rejects other roles", () => {
    for (const role of ["Admin", "Management", "Project", ""]) {
      assert.equal(
        isEligibleCalculationSheetPic({ role, status: "active" }),
        false,
      );
    }
  });
});

describe("CST feature access", () => {
  it("grants VIEW to all four canonical roles", () => {
    for (const role of ["Admin", "Head Office", "Management", "Project"]) {
      assert.equal(canViewCalculationSheet(role), true, role);
    }
    assert.equal(canViewCalculationSheet(""), false);
  });

  it("grants MANAGE only to Admin and Head Office", () => {
    assert.equal(canManageCalculationSheet("Admin"), true);
    assert.equal(canManageCalculationSheet("Head Office"), true);
    assert.equal(canManageCalculationSheet("Management"), false);
    assert.equal(canManageCalculationSheet("Project"), false);
  });

  it("allows read-only roles to view but not manage", () => {
    for (const role of ["Management", "Project"]) {
      assert.doesNotThrow(() => assertViewAccess(actor(role)));
      assert.throws(() => assertManageAccess(actor(role)), CalculationSheetForbiddenError);
    }
  });

  it("rejects suspended accounts on both view and manage", () => {
    assert.throws(
      () => assertViewAccess(actor("Head Office", "suspended")),
      CalculationSheetForbiddenError,
    );
    assert.throws(
      () => assertManageAccess(actor("Head Office", "suspended")),
      CalculationSheetForbiddenError,
    );
  });
});
