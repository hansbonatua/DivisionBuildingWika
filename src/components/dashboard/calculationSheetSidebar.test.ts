import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  calculationSheetMenu,
  getInitialSidebarAccordionState,
  getSidebarVisibility,
  isCalculationSheetPath,
} from "@/components/dashboard/DashboardSidebar";
import { CST_CATEGORIES } from "@/lib/calculation-sheet-template/constants";

// Sidebar regression for Calculation Sheet Template. The sidebar is a Client
// Component, so this exercises the pure navigation model it renders from rather
// than a DOM (the repository has no jsdom/testing-library dependency).

const ROUTE = "/dashboard/calculation-sheet-template";

describe("CST sidebar menu", () => {
  it("puts Summary Report first and then the seven categories", () => {
    assert.equal(calculationSheetMenu.length, 8);
    assert.equal(calculationSheetMenu[0].label, "Summary Report");
    assert.equal(calculationSheetMenu[0].href, `${ROUTE}/summary`);
    assert.deepEqual(
      calculationSheetMenu.slice(1).map((item) => item.label),
      CST_CATEGORIES.map((category) => category.label),
    );
    for (const item of calculationSheetMenu) {
      assert.doesNotMatch(item.label, /^\d+\./);
    }
  });

  it("uses one route per category, with no hash anchors", () => {
    assert.deepEqual(
      calculationSheetMenu.slice(1).map((item) => item.href),
      CST_CATEGORIES.map((category) => `${ROUTE}/${category.id}`),
    );
    for (const item of calculationSheetMenu) {
      assert.equal(item.href.includes("#"), false);
    }
    assert.equal(new Set(calculationSheetMenu.map((item) => item.href)).size, 8);
  });

  it("resolves the root, category, summary, and layout route files", () => {
    const root = path.join(process.cwd(), "src", "app", "dashboard", "calculation-sheet-template");
    assert.equal(existsSync(path.join(root, "page.tsx")), true);
    assert.equal(existsSync(path.join(root, "layout.tsx")), true);
    assert.equal(existsSync(path.join(root, "summary", "page.tsx")), true);
    assert.equal(existsSync(path.join(root, "[kategori]", "page.tsx")), true);
  });
});

describe("CST sidebar visibility", () => {
  it("is visible to all four canonical roles", () => {
    for (const role of ["Admin", "Head Office", "Management", "Project"]) {
      assert.equal(
        getSidebarVisibility(role, false).showCalculationSheet,
        true,
        role,
      );
    }
  });

  it("is hidden for unknown or missing roles", () => {
    assert.equal(getSidebarVisibility("Guest", false).showCalculationSheet, false);
    assert.equal(getSidebarVisibility(undefined, false).showCalculationSheet, false);
  });

  it("stays independent from Program Kerja", () => {
    const project = getSidebarVisibility("Project", false);
    assert.equal(project.showCalculationSheet, true);
    assert.equal(project.showProgramKerja, false);
  });
});

describe("CST accordion state", () => {
  it("opens on the summary and every category route", () => {
    assert.equal(getInitialSidebarAccordionState(`${ROUTE}/summary`).calculationSheetOpen, true);
    for (const category of CST_CATEGORIES) {
      assert.equal(
        getInitialSidebarAccordionState(`${ROUTE}/${category.id}`).calculationSheetOpen,
        true,
        category.id,
      );
    }
    assert.equal(getInitialSidebarAccordionState(ROUTE).calculationSheetOpen, true);
  });

  it("stays closed outside the CST namespace", () => {
    for (const pathname of [
      "/dashboard",
      "/dashboard/users",
      "/dashboard/metode-kerja-standar/summary",
      "/dashboard/knowledge-management/lesson-learn",
    ]) {
      assert.equal(
        getInitialSidebarAccordionState(pathname).calculationSheetOpen,
        false,
        pathname,
      );
    }
  });

  it("scopes the path helper to the CST namespace", () => {
    assert.equal(isCalculationSheetPath(ROUTE), true);
    assert.equal(isCalculationSheetPath(`${ROUTE}/summary`), true);
    assert.equal(isCalculationSheetPath(`${ROUTE}/green_building`), true);
    assert.equal(isCalculationSheetPath("/dashboard/metode-kerja-standar"), false);
  });
});
