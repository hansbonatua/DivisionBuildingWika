import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RegulationForbiddenError,
  assertRegulationManageAccess,
  assertRegulationViewAccess,
  canManageRegulation,
  canViewRegulation,
} from "@/lib/regulation/access";

describe("regulation role matrix", () => {
  it("grants view to every canonical role", () => {
    for (const role of ["Admin", "Head Office", "Management", "Project"]) {
      assert.equal(canViewRegulation(role), true, role);
    }
    assert.equal(canViewRegulation("Guest"), false);
  });

  it("grants manage to Admin and Head Office only", () => {
    assert.equal(canManageRegulation("Admin"), true);
    assert.equal(canManageRegulation("Head Office"), true);
    assert.equal(canManageRegulation("Management"), false);
    assert.equal(canManageRegulation("Project"), false);
    assert.equal(canManageRegulation("Guest"), false);
  });

  it("throws the domain forbidden error from assertions", () => {
    assert.throws(
      () => assertRegulationViewAccess("Guest"),
      RegulationForbiddenError,
    );
    assert.throws(
      () => assertRegulationManageAccess("Project"),
      RegulationForbiddenError,
    );
    assert.doesNotThrow(() => assertRegulationViewAccess("Project"));
    assert.doesNotThrow(() => assertRegulationManageAccess("Head Office"));
  });
});
