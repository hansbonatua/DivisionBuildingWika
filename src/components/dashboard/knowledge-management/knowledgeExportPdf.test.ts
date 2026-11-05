import test from "node:test";
import assert from "node:assert/strict";
import {
  buildKnowledgeRecordPdf,
  buildKnowledgeTablePdf,
  knowledgeRecordPdfFileName,
  knowledgeTablePdfFileName,
} from "@/components/dashboard/knowledge-management/knowledgeExportPdf";
import { EMPTY_KNOWLEDGE_FILTERS } from "@/components/dashboard/knowledge-management/types";
import type { KnowledgeRecordDto } from "@/components/dashboard/knowledge-management/types";

// jsPDF builds documents fully in memory; only view/save touch the browser.
// These tests therefore cover the builders and the deterministic file names,
// not the download/open wrappers (which need a DOM and are Owner runtime gates).

function makeRecord(overrides: Partial<KnowledgeRecordDto> = {}): KnowledgeRecordDto {
  const base = {
    id: "11111111-1111-4111-8111-111111111111",
    knowledge_type: "lesson_learn",
    content: "Isi knowledge baris pertama.\nBaris kedua.",
    project: {
      project_id: "p-1",
      name: "Proyek Alpha (Fase 2)",
      location: "Jakarta",
      year: 2026,
    },
    pics: [
      { user_id: "u-1", name: "Budi", status: "active" },
      { user_id: "u-2", name: "Sari", status: "inactive" },
    ],
    evidence: { name: "Evidence proyek", url: "https://example.com/evidence" },
    created_by: { name: "Ani" },
    created_at: "2026-01-02T03:04:05.000Z",
    updated_by: null,
    updated_at: "2026-01-03T04:05:06.000Z",
    version: 1,
  };
  return { ...base, ...overrides } as KnowledgeRecordDto;
}

test("buildKnowledgeTablePdf renders a landscape document", () => {
  const record = makeRecord();
  const doc = buildKnowledgeTablePdf([record], "lesson_learn", {
    year: 2026,
    projectId: "p-1",
  });

  assert.ok(doc.getNumberOfPages() >= 1);
  assert.ok(doc.output("arraybuffer").byteLength > 1000);
  // jsPDF converts mm to pt internally, so page sizes carry a tiny float.
  assert.ok(Math.abs(doc.internal.pageSize.getWidth() - 297) < 0.01);
  assert.ok(Math.abs(doc.internal.pageSize.getHeight() - 210) < 0.01);
});

test("buildKnowledgeTablePdf handles an empty filtered result", () => {
  const doc = buildKnowledgeTablePdf([], "best_practice", EMPTY_KNOWLEDGE_FILTERS);

  assert.equal(doc.getNumberOfPages(), 1);
  assert.ok(doc.output("arraybuffer").byteLength > 500);
});

test("buildKnowledgeRecordPdf paginates long evidence-safe content", () => {
  const record = makeRecord({
    content: "Baris panjang untuk uji pagination. ".repeat(800),
  });
  const doc = buildKnowledgeRecordPdf(record, "va_ve");

  assert.ok(doc.getNumberOfPages() > 1);
  // jsPDF converts mm to pt internally, so portrait sizes carry a tiny float.
  assert.ok(Math.abs(doc.internal.pageSize.getWidth() - 210) < 0.01);
  assert.ok(Math.abs(doc.internal.pageSize.getHeight() - 297) < 0.01);
});

test("PDF file names are deterministic and follow Knowledge-<kategori>-<timestamp>", () => {
  const fixed = new Date(2026, 10, 5, 9, 7, 3);

  assert.equal(
    knowledgeTablePdfFileName("lesson_learn", fixed),
    "Knowledge-lesson-learn-20261105-090703.pdf",
  );
  assert.equal(
    knowledgeRecordPdfFileName("va_ve", fixed),
    "Knowledge-va-ve-20261105-090703.pdf",
  );
});
