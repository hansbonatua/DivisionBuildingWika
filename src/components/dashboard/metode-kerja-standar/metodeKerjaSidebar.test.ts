import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  getInitialSidebarAccordionState,
  getSidebarVisibility,
  isMetodeKerjaPath,
  metodeKerjaMenu,
} from "@/components/dashboard/DashboardSidebar";
import { getDisiplinBySlug } from "@/lib/metode-kerja-standar/constants";

// Sidebar regression for the Metode Kerja Standar module. The sidebar is a
// Client Component, so this exercises the pure navigation model it renders from
// instead of a DOM (the repository has no jsdom/testing-library dependency).

const METODE_KERJA_LINKS = [
  "/dashboard/metode-kerja-standar/summary",
  "/dashboard/metode-kerja-standar/a-struktur",
  "/dashboard/metode-kerja-standar/b-arsitektur",
  "/dashboard/metode-kerja-standar/c-mep",
  "/dashboard/metode-kerja-standar/d-landscape-hardscape-infrastructure",
  "/dashboard/metode-kerja-standar/e-site-management",
  "/dashboard/metode-kerja-standar/f-lainnya",
];

test("D-D-02: Summary first, then disciplines A–F", () => {
  assert.equal(metodeKerjaMenu.length, 7);
  assert.equal(metodeKerjaMenu[0].label, "Summary");
  assert.equal(metodeKerjaMenu[0].href, METODE_KERJA_LINKS[0]);

  assert.deepEqual(
    metodeKerjaMenu.slice(1).map((item) => item.label.split(".")[0]),
    ["A", "B", "C", "D", "E", "F"],
  );
  assert.deepEqual(
    metodeKerjaMenu.map((item) => item.href),
    METODE_KERJA_LINKS,
  );
});

test("every Metode Kerja submenu points at a resolvable route", () => {
  const appRoot = path.join(process.cwd(), "src", "app", "dashboard", "metode-kerja-standar");

  // Summary is a literal route file; the six disciplines share one dynamic
  // [disiplin] route, so each slug is resolved through the domain constants
  // instead of expecting six page.tsx files.
  assert.equal(existsSync(path.join(appRoot, "summary", "page.tsx")), true);
  assert.equal(existsSync(path.join(appRoot, "[disiplin]", "page.tsx")), true);

  for (const item of metodeKerjaMenu.slice(1)) {
    const slug = item.href.split("/").pop() ?? "";
    assert.ok(getDisiplinBySlug(slug), `unresolvable discipline slug: ${slug}`);
  }
});

test("module root also resolves (redirect page)", () => {
  const rootPage = path.join(
    process.cwd(),
    "src",
    "app",
    "dashboard",
    "metode-kerja-standar",
    "page.tsx",
  );
  assert.equal(existsSync(rootPage), true);
});

test("submenu labels and hrefs are unique", () => {
  assert.equal(
    new Set(metodeKerjaMenu.map((item) => item.label)).size,
    metodeKerjaMenu.length,
  );
  assert.equal(
    new Set(metodeKerjaMenu.map((item) => item.href)).size,
    metodeKerjaMenu.length,
  );
});

test("visibility follows METODE_KERJA_VIEW for every canonical role", () => {
  for (const role of ["Admin", "Head Office", "Management", "Project"]) {
    assert.equal(
      getSidebarVisibility(role, false).showMetodeKerja,
      true,
      `${role} should see Metode Kerja Standar`,
    );
  }

  assert.equal(getSidebarVisibility("Guest", false).showMetodeKerja, false);
  assert.equal(getSidebarVisibility(undefined, false).showMetodeKerja, false);
});

test("visibility stays independent from the other modules", () => {
  const project = getSidebarVisibility("Project", false);
  assert.equal(project.showMetodeKerja, true);
  assert.equal(project.showProgramKerja, false);
  assert.equal(project.showKnowledgeManagement, true);
});

test("isMetodeKerjaPath scopes only the MKS namespace", () => {
  assert.equal(isMetodeKerjaPath("/dashboard/metode-kerja-standar"), true);
  assert.equal(isMetodeKerjaPath("/dashboard/metode-kerja-standar/summary"), true);
  assert.equal(isMetodeKerjaPath("/dashboard/metode-kerja-standar/a-struktur"), true);
  assert.equal(isMetodeKerjaPath("/dashboard/knowledge-management/lesson-learn"), false);
  assert.equal(isMetodeKerjaPath("/dashboard"), false);
});

test("MKS starts collapsed on every non-MKS route", () => {
  // Opsi B: MKS follows the P4 Sub-Fase D design (default collapsed) instead of
  // the KM pattern, so an authorized role no longer opens it implicitly.
  for (const role of ["Admin", "Head Office", "Management", "Project"]) {
    assert.equal(
      getInitialSidebarAccordionState("/dashboard", role).metodeKerjaOpen,
      false,
      `${role} must not get MKS auto-expanded on /dashboard`,
    );
  }

  assert.equal(
    getInitialSidebarAccordionState("/dashboard/users", "Head Office").metodeKerjaOpen,
    false,
  );
  assert.equal(
    getInitialSidebarAccordionState(
      "/dashboard/knowledge-management/lesson-learn",
      "Head Office",
    ).metodeKerjaOpen,
    false,
  );
});

test("MKS opens automatically on an active MKS route", () => {
  for (const [path, role] of [
    ["/dashboard/metode-kerja-standar/summary", "Head Office"],
    ["/dashboard/metode-kerja-standar/c-mep", "Project"],
    ["/dashboard/metode-kerja-standar/f-lainnya", "Management"],
  ] as const) {
    assert.equal(
      getInitialSidebarAccordionState(path, role).metodeKerjaOpen,
      true,
      `${path} should expand MKS`,
    );
  }
});

test("expanding MKS does not drag the other modules open", () => {
  const onRoute = getInitialSidebarAccordionState(
    "/dashboard/metode-kerja-standar/c-mep",
    "Project",
  );

  assert.equal(onRoute.metodeKerjaOpen, true);
  assert.equal(onRoute.programKerjaOpen, false);
  assert.equal(onRoute.masterProjectOpen, false);
  assert.equal(onRoute.engineeringDatabaseOpen, false);
  // KM keeps its governance-approved default-open behaviour.
  assert.equal(onRoute.knowledgeOpen, true);
});

test("the MKS initial state is route-driven, not role-driven", () => {
  // Even an unauthorized role resolves the same route-based value; visibility
  // (showMetodeKerja) is what decides whether the panel is rendered at all.
  assert.equal(
    getInitialSidebarAccordionState("/dashboard/metode-kerja-standar/summary", "Guest")
      .metodeKerjaOpen,
    true,
  );
  assert.equal(
    getInitialSidebarAccordionState("/dashboard", "Guest").metodeKerjaOpen,
    false,
  );
});
