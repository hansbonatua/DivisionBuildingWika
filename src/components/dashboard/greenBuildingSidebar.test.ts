import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  getInitialSidebarAccordionState,
  getSidebarVisibility,
  greenBuildingEsgMenu,
  isGreenBuildingEsgPath,
} from "@/components/dashboard/DashboardSidebar";

// Sidebar regression for Database Green Building & ESG. Exercises the pure
// navigation model rather than a DOM, like the other module sidebar tests.

const ROUTE = "/dashboard/green-building-esg";
const SERTIFIKASI_ROUTE = `${ROUTE}/sertifikasi`;
const ESG_ROUTE = `${ROUTE}/esg`;

describe("Green Building ESG sidebar menu", () => {
  it("contains the Sertifikasi and Penilaian ESG entries", () => {
    assert.equal(greenBuildingEsgMenu.length, 2);
    assert.equal(greenBuildingEsgMenu[0]?.label, "Sertifikasi Green Building");
    assert.equal(greenBuildingEsgMenu[0]?.href, SERTIFIKASI_ROUTE);
    assert.equal(greenBuildingEsgMenu[1]?.label, "Penilaian ESG");
    assert.equal(greenBuildingEsgMenu[1]?.href, ESG_ROUTE);
  });

  it("resolves the root, Sertifikasi, ESG, and guard route files", () => {
    const root = path.join(
      process.cwd(),
      "src",
      "app",
      "dashboard",
      "green-building-esg",
    );
    assert.equal(existsSync(path.join(root, "page.tsx")), true);
    assert.equal(existsSync(path.join(root, "layout.tsx")), true);
    assert.equal(
      existsSync(path.join(root, "sertifikasi", "page.tsx")),
      true,
    );
    assert.equal(
      existsSync(path.join(root, "sertifikasi", "layout.tsx")),
      true,
    );
    assert.equal(existsSync(path.join(root, "esg", "page.tsx")), true);
    assert.equal(existsSync(path.join(root, "esg", "layout.tsx")), true);
  });

  it("scopes the path helper to the new namespace only", () => {
    assert.equal(isGreenBuildingEsgPath(ROUTE), true);
    assert.equal(isGreenBuildingEsgPath(SERTIFIKASI_ROUTE), true);
    assert.equal(isGreenBuildingEsgPath(ESG_ROUTE), true);
    assert.equal(isGreenBuildingEsgPath("/dashboard/green-building"), false);
    assert.equal(
      isGreenBuildingEsgPath("/dashboard/engineering-database"),
      false,
    );
  });
});

describe("Green Building ESG sidebar visibility", () => {
  it("is visible to every canonical role", () => {
    for (const role of ["Admin", "Head Office", "Management", "Project"]) {
      assert.equal(
        getSidebarVisibility(role, false).showGreenBuildingEsg,
        true,
        role,
      );
    }
  });

  it("is hidden for unknown or missing roles", () => {
    assert.equal(
      getSidebarVisibility("Guest", false).showGreenBuildingEsg,
      false,
    );
    assert.equal(
      getSidebarVisibility(undefined, false).showGreenBuildingEsg,
      false,
    );
  });

  it("stays independent from Program Kerja", () => {
    const project = getSidebarVisibility("Project", false);
    assert.equal(project.showGreenBuildingEsg, true);
    assert.equal(project.showProgramKerja, false);
  });
});

describe("Green Building ESG accordion state", () => {
  it("opens on the namespace and Sertifikasi routes", () => {
    assert.equal(
      getInitialSidebarAccordionState(ROUTE).greenBuildingEsgOpen,
      true,
    );
    assert.equal(
      getInitialSidebarAccordionState(SERTIFIKASI_ROUTE).greenBuildingEsgOpen,
      true,
    );
    assert.equal(
      getInitialSidebarAccordionState(ESG_ROUTE).greenBuildingEsgOpen,
      true,
    );
  });

  it("stays closed outside the namespace", () => {
    for (const pathname of [
      "/dashboard",
      "/dashboard/green-building",
      "/dashboard/engineering-database/summary",
      "/dashboard/knowledge-management/lesson-learn",
    ]) {
      assert.equal(
        getInitialSidebarAccordionState(pathname).greenBuildingEsgOpen,
        false,
        pathname,
      );
    }
  });
});
