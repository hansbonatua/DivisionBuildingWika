import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  berkasMenu,
  calculationSheetMenu,
  getInitialSidebarAccordionState,
  getSidebarVisibility,
  knowledgeMenu,
  programKerjaMenu,
  SidebarMenuItem,
  type SidebarItem,
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

const BERKAS_LINKS = [
  "/dashboard/berkas/ajukan",
  "/dashboard/berkas/verifikasi",
];

const DASHBOARD_SIDEBAR_SOURCE = readFileSync(
  path.join(
    process.cwd(),
    "src",
    "components",
    "dashboard",
    "DashboardSidebar.tsx",
  ),
  "utf8",
);

function renderMenuItem(item: SidebarItem, badgeCount = 0): string {
  return renderToStaticMarkup(
    createElement(SidebarMenuItem, {
      item,
      badgeCount,
      isActive: false,
      onClose: () => {},
    }),
  );
}

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

describe("Berkas sidebar navigation", () => {
  it("is visible to every role with BERKAS_VIEW", () => {
    for (const role of ["Admin", "Head Office", "Management", "Project"]) {
      assert.equal(getSidebarVisibility(role, false).showBerkas, true);
    }
    assert.equal(getSidebarVisibility("Guest", false).showBerkas, false);
  });

  it("opens its own accordion on Berkas routes and stays closed elsewhere", () => {
    assert.equal(
      getInitialSidebarAccordionState("/dashboard/berkas/ajukan").berkasOpen,
      true,
    );
    assert.equal(
      getInitialSidebarAccordionState("/dashboard/berkas/verifikasi").berkasOpen,
      true,
    );
    assert.equal(getInitialSidebarAccordionState("/dashboard").berkasOpen, false);
  });

  it("keeps exactly the Ajukan and Verifikasi submenu routes", () => {
    assert.deepEqual(berkasMenu.map((item) => item.href), BERKAS_LINKS);
    assert.deepEqual(berkasMenu.map((item) => item.label), ["Ajukan", "Verifikasi"]);
  });
});

describe("Berkas sidebar badge isolation", () => {
  it("never passes Array.map index as a badge count to non-Berkas menus", () => {
    assert.equal(DASHBOARD_SIDEBAR_SOURCE.includes(".map(renderItem)"), false);
  });

  it("passes berkasNotifCount only to the Berkas submenu", () => {
    const badgeCalls =
      DASHBOARD_SIDEBAR_SOURCE.match(/renderItem\(item, berkasNotifCount\)/g) ?? [];
    assert.equal(badgeCalls.length, 1);
  });

  it("keeps Knowledge Management and CST on the no-badge callback", () => {
    assert.match(
      DASHBOARD_SIDEBAR_SOURCE,
      /knowledgeMenu\.map\(\(item\) => renderItem\(item\)\)/,
    );
    assert.match(
      DASHBOARD_SIDEBAR_SOURCE,
      /calculationSheetMenu\.map\(\(item\) => renderItem\(item\)\)/,
    );
  });

  it("renders Knowledge Management and CST without Berkas badges", () => {
    const nonBerkasMarkup = [knowledgeMenu, calculationSheetMenu]
      .flat()
      .map((item) => renderMenuItem(item))
      .join("");

    assert.doesNotMatch(nonBerkasMarkup, /Berkas membutuhkan tindakan/);
    assert.doesNotMatch(nonBerkasMarkup, /bg-red-500/);
  });

  it("renders the Berkas badge when a count is supplied", () => {
    const berkasMarkup = renderMenuItem(berkasMenu[0], 5);

    assert.match(berkasMarkup, /5 Berkas membutuhkan tindakan/);
    assert.match(berkasMarkup, />5</);
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
