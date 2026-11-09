import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ProjectDocumentationForbiddenError,
  ProjectDocumentationValidationError,
  assertManageAccess,
  assertViewAccess,
  canManageDocumentation,
  canViewDocumentation,
  normalizeDocumentationCatatan,
  normalizeDocumentationUrl,
  buildProjectDocumentationSummary,
  countCompletedWeeks,
  toProjectDocumentationDto,
  type ProjectDocumentationActor,
} from "@/lib/project-documentation/service";
import type {
  ProjectDocumentationListRow,
  ProjectDocumentationSummaryRow,
} from "@/lib/project-documentation/repository";

function actor(role: string, status = "active"): ProjectDocumentationActor {
  return { id: "user-1", role, status };
}

const ROW: ProjectDocumentationListRow = {
  projectId: "22222222-2222-4222-8222-222222222222",
  documentationId: "doc-1",
  projectName: "Project Alpha",
  projectLocation: "Jakarta",
  projectYear: 2026,
  week1Url: "https://example.com/week-1",
  week1UpdatedById: "uploader-1",
  week1UpdatedByName: "Uploader One",
  week1UpdatedAt: new Date("2026-01-02T03:04:05.000Z"),
  week2Url: null,
  week2UpdatedById: null,
  week2UpdatedByName: null,
  week2UpdatedAt: null,
  week3Url: null,
  week3UpdatedById: null,
  week3UpdatedByName: null,
  week3UpdatedAt: null,
  week4Url: null,
  week4UpdatedById: null,
  week4UpdatedByName: null,
  week4UpdatedAt: null,
  week5Url: null,
  week5UpdatedById: null,
  week5UpdatedByName: null,
  week5UpdatedAt: null,
  catatan: "Catatan",
  updatedById: "uploader-1",
  updatedByName: "Uploader One",
  updatedAt: new Date("2026-01-02T03:04:05.000Z"),
};

describe("PDOC normalization", () => {
  it("trims URLs and converts blank values to NULL", () => {
    assert.equal(
      normalizeDocumentationUrl(" https://example.com/a "),
      "https://example.com/a",
    );
    assert.equal(normalizeDocumentationUrl(""), null);
    assert.equal(normalizeDocumentationUrl("   "), null);
    assert.equal(normalizeDocumentationUrl(null), null);
  });

  it("preserves undefined so omitted fields stay untouched", () => {
    assert.equal(normalizeDocumentationUrl(undefined), undefined);
    assert.equal(normalizeDocumentationCatatan(undefined), undefined);
  });

  it("rejects unsafe URLs and over-long values", () => {
    assert.throws(
      () => normalizeDocumentationUrl("ftp://example.com"),
      ProjectDocumentationValidationError,
    );
    assert.throws(
      () => normalizeDocumentationUrl("https://" + "a".repeat(2100)),
      ProjectDocumentationValidationError,
    );
  });

  it("trims catatan and enforces the limit", () => {
    assert.equal(normalizeDocumentationCatatan(" isi "), "isi");
    assert.equal(normalizeDocumentationCatatan("  "), null);
    assert.throws(
      () => normalizeDocumentationCatatan("x".repeat(2001)),
      ProjectDocumentationValidationError,
    );
  });
});

describe("PDOC feature access", () => {
  it("grants VIEW to all four canonical roles", () => {
    for (const role of ["Admin", "Head Office", "Management", "Project"]) {
      assert.equal(canViewDocumentation(role), true, role);
    }
    assert.equal(canViewDocumentation(""), false);
  });

  it("grants MANAGE only to Admin, Head Office and Project", () => {
    assert.equal(canManageDocumentation("Admin"), true);
    assert.equal(canManageDocumentation("Head Office"), true);
    assert.equal(canManageDocumentation("Project"), true);
    assert.equal(canManageDocumentation("Management"), false);
  });

  it("allows Management to view but not manage", () => {
    assert.doesNotThrow(() => assertViewAccess(actor("Management")));
    assert.throws(
      () => assertManageAccess(actor("Management")),
      ProjectDocumentationForbiddenError,
    );
  });

  it("rejects suspended accounts on both view and manage", () => {
    assert.throws(
      () => assertViewAccess(actor("Head Office", "suspended")),
      ProjectDocumentationForbiddenError,
    );
    assert.throws(
      () => assertManageAccess(actor("Project", "suspended")),
      ProjectDocumentationForbiddenError,
    );
  });
});

describe("PDOC DTO", () => {
  it("maps five fixed weeks, period, user references and timestamps", () => {
    const dto = toProjectDocumentationDto(ROW, { year: 2026, month: 1 });

    assert.equal(dto.project_id, ROW.projectId);
    assert.equal(dto.project_name, "Project Alpha");
    assert.equal(dto.year, 2026);
    assert.equal(dto.month, 1);
    assert.equal(dto.documented, true);
    assert.equal(dto.weeks.length, 5);
    assert.deepEqual(
      dto.weeks.map((week) => week.week),
      [1, 2, 3, 4, 5],
    );
    assert.deepEqual(dto.weeks[0].updated_by, {
      user_id: "uploader-1",
      name: "Uploader One",
    });
    assert.equal(dto.weeks[0].updated_at, "2026-01-02T03:04:05.000Z");
    assert.equal(dto.weeks[1].updated_by, null);
    assert.equal(dto.weeks[1].updated_at, null);
    assert.deepEqual(dto.updated_by, {
      user_id: "uploader-1",
      name: "Uploader One",
    });
    assert.equal(dto.updated_at, "2026-01-02T03:04:05.000Z");
  });

  it("marks a project without a documentation row as not documented", () => {
    const dto = toProjectDocumentationDto(
      { ...ROW, documentationId: null },
      { year: 2026, month: 2 },
    );
    assert.equal(dto.documented, false);
    assert.equal(dto.year, 2026);
    assert.equal(dto.month, 2);
  });
});

describe("PDOC summary", () => {
  function summaryRow(
    overrides: Partial<ProjectDocumentationSummaryRow> = {},
  ): ProjectDocumentationSummaryRow {
    return {
      projectId: "22222222-2222-4222-8222-222222222222",
      projectName: "Project Alpha",
      projectLocation: "Jakarta",
      projectYear: 2026,
      documentationId: "doc-1",
      month: 1,
      week1Url: "https://example.com/week-1",
      week2Url: "https://example.com/week-2",
      week3Url: null,
      week4Url: null,
      week5Url: null,
      ...overrides,
    };
  }

  it("counts only non-null week URLs", () => {
    assert.equal(countCompletedWeeks(summaryRow()), 2);
    assert.equal(
      countCompletedWeeks(
        summaryRow({
          week1Url: "https://example.com/1",
          week2Url: "https://example.com/2",
          week3Url: "https://example.com/3",
          week4Url: "https://example.com/4",
          week5Url: "https://example.com/5",
        }),
      ),
      5,
    );
    assert.equal(countCompletedWeeks(summaryRow({ week1Url: null })), 1);
  });

  it("expands every project to twelve months and keeps missing months at 0/5", () => {
    const summary = buildProjectDocumentationSummary(
      [summaryRow()],
      2026,
      [2026, 2025],
    );

    assert.equal(summary.rows.length, 1);
    assert.equal(summary.rows[0].months.length, 12);
    assert.deepEqual(summary.rows[0].months[0], {
      month: 1,
      completed_weeks: 2,
      total_weeks: 5,
      documented: true,
    });
    assert.deepEqual(summary.rows[0].months[1], {
      month: 2,
      completed_weeks: 0,
      total_weeks: 5,
      documented: false,
    });
    assert.equal(summary.months.length, 12);
    assert.equal(summary.available_years[0], 2026);
  });

  it("keeps projects with no documentation as 0/5 rows", () => {
    const summary = buildProjectDocumentationSummary(
      [
        summaryRow({
          documentationId: null,
          month: null,
          week1Url: null,
          week2Url: null,
        }),
      ],
      2026,
      [2026],
    );

    assert.equal(summary.rows.length, 1);
    assert.equal(summary.rows[0].months.length, 12);
    assert.equal(
      summary.rows[0].months.every(
        (month) => month.completed_weeks === 0 && month.documented === false,
      ),
      true,
    );
  });

  it("reports a documented month with zero URLs as 0/5 but documented", () => {
    const summary = buildProjectDocumentationSummary(
      [
        summaryRow({
          month: 2,
          week1Url: null,
          week2Url: null,
        }),
      ],
      2026,
      [2026],
    );

    assert.deepEqual(summary.rows[0].months[1], {
      month: 2,
      completed_weeks: 0,
      total_weeks: 5,
      documented: true,
    });
  });
});
