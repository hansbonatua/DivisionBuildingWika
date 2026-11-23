import assert from "node:assert/strict";
import test from "node:test";
import {
  getInitialSidebarAccordionState,
  getSidebarVisibility,
  isLearningPath,
  learningMenu,
} from "./DashboardSidebar";
import { canManageLearning } from "../../lib/learning/access";

// Regression guards for the Building Learning Center sidebar entry. The
// accordion and its Admin Control item are the only navigation surface of the
// module, so a broken href or visibility rule hides the whole feature.

test("isLearningPath matches only the BLC namespace", () => {
  assert.equal(isLearningPath("/dashboard/learning"), true);
  assert.equal(isLearningPath("/dashboard/learning/sharing"), true);
  assert.equal(isLearningPath("/dashboard/learning/sharing/abc"), true);
  assert.equal(isLearningPath("/dashboard/learning/admin"), true);
  assert.equal(isLearningPath("/dashboard/learning-other"), false);
  assert.equal(isLearningPath("/dashboard"), false);
});

test("learningMenu exposes the four canonical submenus", () => {
  assert.deepEqual(
    learningMenu.map((item) => ({ label: item.label, href: item.href })),
    [
      { label: "Sharing Session", href: "/dashboard/learning/sharing" },
      { label: "Training", href: "/dashboard/learning/training" },
      { label: "Certificate", href: "/dashboard/learning/certificate" },
      { label: "Admin Control", href: "/dashboard/learning/admin" },
    ],
  );
});

test("showLearning follows LEARNING_VIEW for every role", () => {
  for (const role of ["Admin", "Head Office", "Management", "Project"]) {
    assert.equal(
      getSidebarVisibility(role, false).showLearning,
      true,
      `${role} should see Building Learning Center`,
    );
  }
  assert.equal(getSidebarVisibility("Staff", false).showLearning, false);
  assert.equal(getSidebarVisibility("Guest", false).showLearning, false);
  assert.equal(getSidebarVisibility(undefined, false).showLearning, false);
});

test("Admin Control is gated by LEARNING_MANAGE, not LEARNING_VIEW", () => {
  assert.equal(canManageLearning("Admin"), true);
  assert.equal(canManageLearning("Head Office"), true);
  assert.equal(canManageLearning("Management"), false);
  assert.equal(canManageLearning("Project"), false);
  assert.equal(canManageLearning("Guest"), false);
});

test("the BLC accordion starts open only on its own routes", () => {
  assert.equal(
    getInitialSidebarAccordionState("/dashboard/learning/sharing").learningOpen,
    true,
  );
  assert.equal(
    getInitialSidebarAccordionState("/dashboard/learning/sharing/abc-123")
      .learningOpen,
    true,
  );
  assert.equal(
    getInitialSidebarAccordionState("/dashboard/learning/admin").learningOpen,
    true,
  );
  assert.equal(
    getInitialSidebarAccordionState("/dashboard").learningOpen,
    false,
  );
  assert.equal(
    getInitialSidebarAccordionState("/dashboard/learning-other").learningOpen,
    false,
  );
});
