import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_PDOC_DRAFT,
  draftEquals,
  draftToUpdatePayload,
  filterPdocRows,
  formatPdocMetadata,
  formatPdocTimestamp,
  setPdocWeek,
  toPdocDraft,
  validatePdocDraft,
  type PdocRowDto,
} from "@/lib/project-documentation/pdoc-draft";

const ROW: PdocRowDto = {
  project_id: "22222222-2222-4222-8222-222222222222",
  project_name: "Gedung Alpha",
  project_location: "Jakarta",
  project_year: 2026,
  weeks: [
    {
      week: 1,
      url: "https://example.com/week-1",
      updated_by: { user_id: "u1", name: "Budi" },
      updated_at: "2026-11-12T07:30:00.000Z",
    },
    { week: 2, url: null, updated_by: null, updated_at: null },
    { week: 3, url: "https://example.com/week-3", updated_by: null, updated_at: null },
    { week: 4, url: null, updated_by: null, updated_at: null },
    { week: 5, url: null, updated_by: null, updated_at: null },
  ],
  catatan: "Catatan project",
  updated_by: { user_id: "u1", name: "Budi" },
  updated_at: "2026-11-12T07:30:00.000Z",
};

describe("PDOC draft helpers", () => {
  it("maps the five API weeks into an editable draft", () => {
    const draft = toPdocDraft(ROW);
    assert.deepEqual(draft.weeks, [
      "https://example.com/week-1",
      "",
      "https://example.com/week-3",
      "",
      "",
    ]);
    assert.equal(draft.catatan, "Catatan project");
  });

  it("maps missing weeks and null catatan safely", () => {
    const draft = toPdocDraft({ ...ROW, weeks: [], catatan: null });
    assert.deepEqual(draft.weeks, ["", "", "", "", ""]);
    assert.equal(draft.catatan, "");
  });

  it("compares drafts and updates one week without mutating the source", () => {
    const base = toPdocDraft(ROW);
    const changed = setPdocWeek(base, 1, "https://example.com/week-2");

    assert.equal(draftEquals(base, toPdocDraft(ROW)), true);
    assert.equal(draftEquals(base, changed), false);
    assert.equal(changed.weeks[1], "https://example.com/week-2");
    assert.equal(base.weeks[1], "");
    assert.equal(draftEquals(base, setPdocWeek(base, 9, "ignored")), true);
  });

  it("validates URLs, length limits and catatan", () => {
    assert.equal(validatePdocDraft(EMPTY_PDOC_DRAFT), null);
    assert.equal(
      validatePdocDraft(setPdocWeek(EMPTY_PDOC_DRAFT, 0, "ftp://example.com"))
        ?.field,
      "week_1_url",
    );
    assert.equal(
      validatePdocDraft(
        setPdocWeek(EMPTY_PDOC_DRAFT, 4, "https://" + "a".repeat(2100)),
      )?.field,
      "week_5_url",
    );
    assert.equal(
      validatePdocDraft({ ...EMPTY_PDOC_DRAFT, catatan: "c".repeat(2001) })
        ?.field,
      "catatan",
    );
  });

  it("builds a complete update payload and converts blanks to NULL", () => {
    const draft = setPdocWeek(toPdocDraft(ROW), 1, "  ");
    draft.catatan = " Catatan baru ";
    const payload = draftToUpdatePayload(draft);

    assert.ok(payload);
    assert.equal(payload.week_1_url, "https://example.com/week-1");
    assert.equal(payload.week_2_url, null);
    assert.equal(payload.week_3_url, "https://example.com/week-3");
    assert.equal(payload.week_4_url, null);
    assert.equal(payload.week_5_url, null);
    assert.equal(payload.catatan, "Catatan baru");
  });

  it("returns null payload for an invalid draft", () => {
    assert.equal(
      draftToUpdatePayload(
        setPdocWeek(EMPTY_PDOC_DRAFT, 0, "javascript:alert(1)"),
      ),
      null,
    );
  });

  it("formats audit timestamps as id-ID dates in Asia/Jakarta", () => {
    assert.equal(formatPdocTimestamp("2026-11-12T07:30:00.000Z"), "12 Nov 2026");
    assert.equal(formatPdocTimestamp(null), "—");
    assert.equal(formatPdocTimestamp("not-a-date"), "—");
    assert.equal(
      formatPdocMetadata(ROW.weeks[0]),
      "Oleh: Budi, 12 Nov 2026",
    );
  });

  it("filters by project name, case-insensitively, without mutating rows", () => {
    const other: PdocRowDto = {
      ...ROW,
      project_id: "33333333-3333-4333-8333-333333333333",
      project_name: "Gedung Beta",
    };
    const rows = [ROW, other];

    assert.deepEqual(filterPdocRows(rows, "  alpha "), [ROW]);
    assert.deepEqual(filterPdocRows(rows, "BETA"), [other]);
    assert.deepEqual(filterPdocRows(rows, ""), rows);
    assert.notEqual(filterPdocRows(rows, ""), rows);
    assert.equal(rows[0], ROW);
  });
});
