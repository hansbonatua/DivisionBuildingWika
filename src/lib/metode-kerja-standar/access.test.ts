import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MetodeKerjaForbiddenError,
  assertDeleteAccess,
  assertManageAccess,
  assertViewAccess,
  canDeleteMetodeKerja,
  canManageMetodeKerja,
  canViewMetodeKerja,
  isEligibleMetodeKerjaPic,
} from "@/lib/metode-kerja-standar/access";

describe("metode kerja role matrix", () => {
  it("grants view to all canonical roles", () => {
    for (const role of ["Admin", "Head Office", "Management", "Project"]) {
      assert.equal(canViewMetodeKerja(role), true, role);
    }
    assert.equal(canViewMetodeKerja("Guest"), false);
  });

  it("grants manage to Admin and Head Office only", () => {
    assert.equal(canManageMetodeKerja("Admin"), true);
    assert.equal(canManageMetodeKerja("Head Office"), true);
    assert.equal(canManageMetodeKerja("Management"), false);
    assert.equal(canManageMetodeKerja("Project"), false);
  });

  it("grants delete to Admin only", () => {
    assert.equal(canDeleteMetodeKerja("Admin"), true);
    assert.equal(canDeleteMetodeKerja("Head Office"), false);
    assert.equal(canDeleteMetodeKerja("Management"), false);
    assert.equal(canDeleteMetodeKerja("Project"), false);
  });

  it("throws the domain forbidden error from assertions", () => {
    assert.throws(() => assertViewAccess("Guest"), MetodeKerjaForbiddenError);
    assert.throws(() => assertManageAccess("Project"), MetodeKerjaForbiddenError);
    assert.throws(() => assertDeleteAccess("Head Office"), MetodeKerjaForbiddenError);
    assert.doesNotThrow(() => assertDeleteAccess("Admin"));
  });
});

describe("metode kerja PIC eligibility", () => {
  it("accepts active and suspended Head Office users", () => {
    assert.equal(
      isEligibleMetodeKerjaPic({ role: "Head Office", status: "active" }),
      true,
    );
    assert.equal(
      isEligibleMetodeKerjaPic({ role: "Head Office", status: "suspended" }),
      true,
    );
  });

  it("rejects every other role", () => {
    for (const role of ["Admin", "Management", "Project", "Guest"]) {
      assert.equal(
        isEligibleMetodeKerjaPic({ role, status: "active" }),
        false,
        role,
      );
    }
  });
});
