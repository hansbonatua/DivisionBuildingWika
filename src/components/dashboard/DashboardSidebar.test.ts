import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  getInitialSidebarAccordionState,
  getSidebarVisibility,
  knowledgeMenu,
  programKerjaMenu,
} from "./DashboardSidebar";

const KNOWLEDGE_LINKS = [
  "/dashboard/knowledge-management/lesson-learn",
  "/dashboard/knowledge-management/best-practice",
  "/dashboard/knowledge-management/va-ve",
];

const PROGRAM_KERJA_LINKS = [
  "/dashboard/program-kerja/summary",
  "/dashboard/program-kerja/manage",
];

// The sidebar is a Client Component, so these regression tests exercise the
// pure navigation model it renders from rather than a DOM (the repository has
// no jsdom/testing-library dependency).

describe("sidebar Knowledge Management visibility", () => {
  for (const role of ["Admin", "Head Office", "Management", "Project"]) {
    it(`${role} sees Knowledge Management`, () => {
      assert.equal(getSidebarVisibility(role, false).showKnowledgeManagement, true);
    });
  }

  it("Project sees Knowledge Management despite lacking PROGRAM_KERJA_VIEW", () => {
    const visibility = getSidebarVisibility("Project", false);
    assert.equal(visibility.showKnowledgeManagement, true);
    assert.equal(visibility.showProgramKerja, false);
  });

  it("hides Knowledge Management when KNOWLEDGE_MANAGEMENT_VIEW is not granted", () => {
    assert.equal(getSidebarVisibility("Guest", false).showKnowledgeManagement, false);
    assert.equal(getSidebarVisibility(undefined, false).showKnowledgeManagement, false);
  });
});

describe("Knowledge Management independent top-level accordion", () => {
  it("starts collapsed on the dashboard, like every other route-driven module", () => {
    // The helper no longer takes a role: expansion is purely route-driven, so
    // this assertion cannot depend on which role is signed in.
    const state = getInitialSidebarAccordionState("/dashboard");
    assert.equal(state.knowledgeOpen, false);
    assert.equal(state.programKerjaOpen, false);
  });

  it("stays collapsed on routes without either module", () => {
    const state = getInitialSidebarAccordionState("/dashboard/users");
    assert.equal(state.knowledgeOpen, false);
    assert.equal(state.programKerjaOpen, false);
  });

  it("opens automatically on a Knowledge Management route", () => {
    const state = getInitialSidebarAccordionState(
      "/dashboard/knowledge-management/lesson-learn",
    );
    assert.equal(state.knowledgeOpen, true);
  });

  it("still opens Program Kerja for its own route", () => {
    const state = getInitialSidebarAccordionState("/dashboard/program-kerja/summary");
    assert.equal(state.programKerjaOpen, true);
  });

  it("derives the initial state from the route, not from the role", () => {
    // A role without KNOWLEDGE_MANAGEMENT_VIEW resolves the same route-based
    // value; visibility (showKnowledgeManagement) decides whether it renders.
    assert.equal(getSidebarVisibility("Guest", false).showKnowledgeManagement, false);
    assert.equal(
      getInitialSidebarAccordionState("/dashboard").knowledgeOpen,
      false,
    );
    assert.equal(
      getInitialSidebarAccordionState("/dashboard/knowledge-management/va-ve")
        .knowledgeOpen,
      true,
    );
  });
});

describe("Knowledge Management menu links", () => {
  it("keeps the three canonical submenu routes", () => {
    assert.deepEqual(
      knowledgeMenu.map((item) => item.href),
      KNOWLEDGE_LINKS,
    );
  });

  it("points every submenu at an existing route file", () => {
    for (const href of KNOWLEDGE_LINKS) {
      const pagePath = path.join(
        process.cwd(),
        "src",
        "app",
        href.replace(/^\//, ""),
        "page.tsx",
      );
      assert.equal(existsSync(pagePath), true, `missing route: ${pagePath}`);
    }
  });

  it("has no duplicate label or href", () => {
    assert.equal(
      new Set(knowledgeMenu.map((item) => item.label)).size,
      knowledgeMenu.length,
    );
    assert.equal(
      new Set(knowledgeMenu.map((item) => item.href)).size,
      knowledgeMenu.length,
    );
  });

  it("does not render Knowledge Management inside Program Kerja", () => {
    const programKerjaHrefs = programKerjaMenu.map((item) => item.href);
    for (const href of KNOWLEDGE_LINKS) {
      assert.equal(programKerjaHrefs.includes(href), false);
    }
  });
});

describe("Program Kerja navigation regression", () => {
  it("keeps its two existing links and order", () => {
    assert.deepEqual(
      programKerjaMenu.map((item) => item.href),
      PROGRAM_KERJA_LINKS,
    );
    assert.deepEqual(
      programKerjaMenu.map((item) => item.label),
      ["Summary Report", "Kelola Program Kerja"],
    );
  });
});
