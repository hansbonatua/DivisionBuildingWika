import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GreenBuildingEsgForbiddenError,
  assertManageAccess,
  assertViewAccess,
  canManageGreenBuildingEsg,
  canViewGreenBuildingEsg,
} from "@/lib/green-building-esg/access";

describe("green building ESG role matrix", () => {
  it("grants view to every canonical role", () => {
    for (const role of ["Admin", "Head Office", "Management", "Project"]) {
      assert.equal(canViewGreenBuildingEsg(role), true, role);
    }
    assert.equal(canViewGreenBuildingEsg("Guest"), false);
  });

  it("grants manage to Admin and Head Office only", () => {
    assert.equal(canManageGreenBuildingEsg("Admin"), true);
    assert.equal(canManageGreenBuildingEsg("Head Office"), true);
    assert.equal(canManageGreenBuildingEsg("Management"), false);
    assert.equal(canManageGreenBuildingEsg("Project"), false);
    assert.equal(canManageGreenBuildingEsg("Guest"), false);
  });

  it("throws the domain forbidden error from assertions", () => {
    assert.throws(
      () => assertViewAccess("Guest"),
      GreenBuildingEsgForbiddenError,
    );
    assert.throws(
      () => assertManageAccess("Project"),
      GreenBuildingEsgForbiddenError,
    );
    assert.doesNotThrow(() => assertViewAccess("Project"));
    assert.doesNotThrow(() => assertManageAccess("Head Office"));
  });
});
