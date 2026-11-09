import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  getSidebarVisibility,
  projectDocumentationMenu,
} from "@/components/dashboard/DashboardSidebar";

// Sidebar regression for Project Documentation. The sidebar is a Client
// Component, so this exercises the pure navigation model it renders from rather
// than a DOM (the repository has no jsdom/testing-library dependency).

const ROUTE = "/dashboard/project-documentation";

describe("Project Documentation sidebar menu", () => {
  it("is a single Core Enterprise item at the canonical route", () => {
    assert.equal(projectDocumentationMenu.label, "Project Documentation");
    assert.equal(projectDocumentationMenu.href, ROUTE);
  });

  it("resolves the page and guard layout route files", () => {
    const root = path.join(
      process.cwd(),
      "src",
      "app",
      "dashboard",
      "project-documentation",
    );
    assert.equal(existsSync(path.join(root, "page.tsx")), true);
    assert.equal(existsSync(path.join(root, "layout.tsx")), true);
  });
});

describe("Project Documentation sidebar visibility", () => {
  it("is visible to all four canonical roles", () => {
    for (const role of ["Admin", "Head Office", "Management", "Project"]) {
      assert.equal(
        getSidebarVisibility(role, false).showProjectDocumentation,
        true,
        role,
      );
    }
  });

  it("is hidden for unknown or missing roles", () => {
    assert.equal(
      getSidebarVisibility("Guest", false).showProjectDocumentation,
      false,
    );
    assert.equal(
      getSidebarVisibility(undefined, false).showProjectDocumentation,
      false,
    );
  });

  it("keeps Core Enterprise visible for Project even without Program Kerja", () => {
    const project = getSidebarVisibility("Project", false);
    assert.equal(project.showProjectDocumentation, true);
    assert.equal(project.showProgramKerja, false);
    assert.equal(project.showCoreEnterprise, true);
  });
});
