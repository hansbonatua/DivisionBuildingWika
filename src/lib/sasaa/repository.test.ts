import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getEngDbStatus,
  getEsgMonths,
  getGreenBuilding,
  getKnowledgeSummary,
  getMslMonths,
  getPdocMonths,
  pickLatestGreenBuilding,
} from "./repository";

// The aggregate functions are driven by row fixtures through an injected db, so
// the shaping rules (empty month, category mapping, paging offsets, newest
// certificate) are verified without a database. Each select() call takes the
// next batch, which keeps Promise.all ordering deterministic.

type Row = Record<string, unknown>;

function stubDb(batches: Row[][]): {
  db: never;
  captures: Array<{ limit?: number; offset?: number }>;
} {
  const captures: Array<{ limit?: number; offset?: number }> = [];
  let index = 0;

  const db = {
    select: () => {
      const rows = batches[index] ?? [];
      index += 1;
      const capture: { limit?: number; offset?: number } = {};
      captures.push(capture);

      const chain: Record<string, unknown> = {};
      for (const method of [
        "from",
        "innerJoin",
        "leftJoin",
        "where",
        "orderBy",
        "groupBy",
      ]) {
        chain[method] = () => chain;
      }
      chain.limit = (value: number) => {
        capture.limit = value;
        return chain;
      };
      chain.offset = (value: number) => {
        capture.offset = value;
        return chain;
      };
      chain.then = (
        resolve: (value: Row[]) => unknown,
        reject: (error: unknown) => unknown,
      ) => Promise.resolve(rows).then(resolve, reject);

      return chain;
    },
  };

  return { db: db as never, captures };
}

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

function esgRow(overrides: Partial<Row>): Row {
  const row: Row = {};
  for (let month = 1; month <= 12; month += 1) {
    row[`month${month}Status`] = null;
  }
  return { ...row, ...overrides };
}

describe("SASAA aggregate repository", () => {
  it("getPdocMonths returns 12 months and leaves undocumented months at 0", async () => {
    const { db } = stubDb([
      [
        {
          month: 3,
          week1Url: "https://example.com/1",
          week2Url: "https://example.com/2",
          week3Url: null,
          week4Url: null,
          week5Url: null,
        },
      ],
    ]);

    const points = await getPdocMonths(PROJECT_ID, 2026, db);

    assert.equal(points.length, 12);
    assert.deepEqual(
      points.map((point) => point.month),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    );
    assert.equal(points[0]?.value, 0);
    assert.equal(points[2]?.value, 2);
    assert.equal(points[11]?.value, 0);
  });

  it("getMslMonths zeroes unassessed months and averages the three components", async () => {
    const { db } = stubDb([
      [
        {
          assessmentMonth: 2,
          engineeringValue: "4.00",
          metodeKerja: "3.00",
          engineeringExecution: "2.00",
        },
      ],
    ]);

    const months = await getMslMonths(PROJECT_ID, 2026, db);

    assert.equal(months.length, 12);
    assert.deepEqual(months[0], {
      total: 0,
      engineeringValue: 0,
      metodeKerja: 0,
      engineeringExecution: 0,
    });
    assert.deepEqual(months[1], {
      total: 3,
      engineeringValue: 4,
      metodeKerja: 3,
      engineeringExecution: 2,
    });
    assert.equal(months[11]?.total, 0);
  });

  it("getMslMonths returns all zeros when the project has no assessment", async () => {
    const { db } = stubDb([[]]);

    const months = await getMslMonths(PROJECT_ID, 2026, db);

    assert.equal(months.length, 12);
    assert.equal(
      months.every(
        (month) =>
          month.total === 0 &&
          month.engineeringValue === 0 &&
          month.metodeKerja === 0 &&
          month.engineeringExecution === 0,
      ),
      true,
    );
  });

  it("getEsgMonths maps Complete, Half and empty cells", async () => {
    const { db } = stubDb([
      [
        esgRow({
          month1Status: "Complete",
          month2Status: "Half",
          month12Status: "Complete",
        }),
      ],
    ]);

    const months = await getEsgMonths(PROJECT_ID, 2026, db);

    assert.equal(months.length, 12);
    assert.equal(months[0], "Complete");
    assert.equal(months[1], "Half");
    assert.equal(months[2], null);
    assert.equal(months[11], "Complete");
  });

  it("getEsgMonths returns twelve empty cells when the year has no row", async () => {
    const { db } = stubDb([[]]);

    const months = await getEsgMonths(PROJECT_ID, 2026, db);

    assert.equal(months.length, 12);
    assert.equal(months.every((status) => status === null), true);
  });

  it("getKnowledgeSummary pages per category with the right offset and hasMore", async () => {
    const { db, captures } = stubDb([
      [
        { knowledgeType: "lesson_learn", total: 7 },
        { knowledgeType: "best_practice", total: 1 },
        { knowledgeType: "va_ve", total: 0 },
      ],
      [
        { id: "ll-4", content: "Lesson learn keempat." },
        { id: "ll-5", content: "Lesson learn kelima." },
        { id: "ll-6", content: "Lesson learn keenam." },
      ],
      [{ id: "bp-4", content: "Best practice keempat." }],
      [],
    ]);

    const page = await getKnowledgeSummary(PROJECT_ID, 2, 3, db);

    assert.equal(page.page, 2);
    assert.equal(page.perCategory, 3);
    assert.deepEqual(page.counts, {
      total: 8,
      lessonLearn: 7,
      bestPractice: 1,
      vaVe: 0,
    });
    assert.equal(page.hasMore, true);
    assert.equal(page.byCategory.lesson_learn.length, 3);
    assert.equal(page.byCategory.lesson_learn[0]?.id, "ll-4");
    assert.equal(page.byCategory.va_ve.length, 0);

    // First select is the grouped count, then one bounded query per category.
    assert.equal(captures.length, 4);
    assert.equal(captures[1]?.limit, 3);
    assert.equal(captures[1]?.offset, 3);
    assert.equal(captures[2]?.offset, 3);
    assert.equal(captures[3]?.offset, 3);
  });

  it("getGreenBuilding returns the newest certificate by certificateYear", async () => {
    const { db } = stubDb([
      [
        {
          lembaga: "Greenship",
          level: "Gold",
          status: "Certified",
          certificateYear: 2024,
          documentationUrl: "https://example.com/sertifikat",
        },
      ],
    ]);

    const certificate = await getGreenBuilding(PROJECT_ID, db);

    assert.deepEqual(certificate, {
      lembaga: "Greenship",
      level: "Gold",
      status: "Certified",
      certificateYear: 2024,
      documentationUrl: "https://example.com/sertifikat",
    });
  });

  it("pickLatestGreenBuilding ignores input order and tolerates no rows", () => {
    const older = {
      lembaga: "BGH",
      level: "Utama",
      status: "Certified",
      certificateYear: 2022,
      documentationUrl: null,
    };
    const newer = {
      lembaga: "Greenship",
      level: "Platinum",
      status: "Certified",
      certificateYear: 2025,
      documentationUrl: null,
    };

    assert.equal(pickLatestGreenBuilding([older, newer])?.certificateYear, 2025);
    assert.equal(pickLatestGreenBuilding([newer, older])?.certificateYear, 2025);
    assert.equal(pickLatestGreenBuilding([]), null);
  });

  it("getEngDbStatus counts coverage against the canonical category list", async () => {
    const { db } = stubDb([
      [{ category: "BIM" }, { category: "ENGINEERING_DRAWING" }],
    ]);

    const status = await getEngDbStatus(PROJECT_ID, db);

    assert.equal(status.total, 6);
    assert.equal(status.covered, 2);
    assert.equal(status.categories.length, 6);
    assert.equal(
      status.categories.find((entry) => entry.category === "BIM")?.covered,
      true,
    );
    assert.equal(
      status.categories.find((entry) => entry.category === "SPESIFIKASI_TEKNIS")
        ?.covered,
      false,
    );
  });
});
