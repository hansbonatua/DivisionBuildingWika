import assert from "node:assert/strict";
import { afterEach, test, mock } from "node:test";
import { JSDOM } from "jsdom";

// Same bootstrap as the other component suites: node --test has no DOM, so a
// single jsdom window is installed on globalThis before React is required.
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
const browserWindow = dom.window as unknown as Window & typeof globalThis;
const globals = globalThis as unknown as Record<string, unknown>;

globals.window = browserWindow;
globals.document = browserWindow.document;
try {
  Object.defineProperty(globalThis, "navigator", {
    value: browserWindow.navigator,
    configurable: true,
  });
} catch {
  // Node's own navigator is fine for these tests.
}
for (const key of [
  "HTMLElement",
  "HTMLInputElement",
  "HTMLButtonElement",
  "Element",
  "Node",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "MutationObserver",
  "DocumentFragment",
  "NodeList",
  "SVGElement",
  "getComputedStyle",
]) {
  globals[key] = (browserWindow as unknown as Record<string, unknown>)[key];
}
globals.IS_REACT_ACT_ENVIRONMENT = true;

/* eslint-disable @typescript-eslint/no-require-imports */
const { cleanup, fireEvent, render, screen, waitFor } =
  require("@testing-library/react") as typeof import("@testing-library/react");
const { default: KnowledgeTable } =
  require("./KnowledgeTable") as typeof import("./KnowledgeTable");
/* eslint-enable @typescript-eslint/no-require-imports */

import type { SasaaKnowledgePage } from "./types";

afterEach(() => {
  cleanup();
  mock.restoreAll();
});

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function pageFixture(
  overrides: Partial<SasaaKnowledgePage> = {},
): SasaaKnowledgePage {
  return {
    counts: { total: 6, lessonLearn: 4, bestPractice: 1, vaVe: 1 },
    byCategory: {
      lesson_learn: [
        { id: "ll-1", content: "Lesson learn satu." },
        { id: "ll-2", content: "Lesson learn dua." },
        { id: "ll-3", content: "Lesson learn tiga." },
        { id: "ll-4", content: "Lesson learn empat." },
      ],
      best_practice: [{ id: "bp-1", content: "Best practice satu." }],
      va_ve: [{ id: "vv-1", content: "VA VE satu." }],
    },
    page: 1,
    perCategory: 3,
    hasMore: true,
    ...overrides,
  };
}

test("renders the three categories with at most three items each", () => {
  render(<KnowledgeTable initial={pageFixture()} projectId={PROJECT_ID} />);

  assert.ok(screen.getByText("LL"));
  assert.ok(screen.getByText("VA/VE"));
  assert.ok(screen.getByText("KI/KM"));

  assert.ok(screen.getByText("Lesson learn satu."));
  assert.ok(screen.getByText("Lesson learn tiga."));
  assert.equal(screen.queryByText("Lesson learn empat."), null);
  assert.ok(screen.getByText("VA VE satu."));
  assert.ok(screen.getByText("Best practice satu."));
});

test("Next fetches page 2 and replaces the content", async () => {
  const calls: string[] = [];
  globals.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return jsonResponse({
      data: pageFixture({
        page: 2,
        hasMore: false,
        byCategory: {
          lesson_learn: [{ id: "ll-9", content: "Konten halaman dua." }],
          best_practice: [],
          va_ve: [],
        },
      }),
    });
  }) as typeof fetch;

  render(<KnowledgeTable initial={pageFixture()} projectId={PROJECT_ID} />);

  fireEvent.click(screen.getByText("Next"));

  await waitFor(() => {
    assert.ok(screen.getByText("Konten halaman dua."));
  });
  assert.equal(screen.queryByText("Lesson learn satu."), null);
  assert.equal(calls.length, 1);
  assert.match(calls[0] ?? "", /\/knowledge\?page=2$/);
});

test("Prev after Next requests page 1 again", async () => {
  const calls: string[] = [];
  globals.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    const page = calls.length === 1 ? 2 : 1;
    return jsonResponse({
      data: pageFixture({
        page,
        hasMore: page === 1,
        byCategory:
          page === 1
            ? {
                lesson_learn: [{ id: "ll-1", content: "Kembali ke halaman satu." }],
                best_practice: [],
                va_ve: [],
              }
            : {
                lesson_learn: [{ id: "ll-9", content: "Konten halaman dua." }],
                best_practice: [],
                va_ve: [],
              },
      }),
    });
  }) as typeof fetch;

  render(<KnowledgeTable initial={pageFixture()} projectId={PROJECT_ID} />);

  fireEvent.click(screen.getByText("Next"));
  await waitFor(() => {
    assert.ok(screen.getByText("Konten halaman dua."));
  });

  fireEvent.click(screen.getByText("Prev"));
  await waitFor(() => {
    assert.ok(screen.getByText("Kembali ke halaman satu."));
  });

  assert.equal(calls.length, 2);
  assert.match(calls[1] ?? "", /\/knowledge\?page=1$/);
});

test("shows the empty state when the project has no knowledge", () => {
  render(
    <KnowledgeTable
      initial={pageFixture({
        counts: { total: 0, lessonLearn: 0, bestPractice: 0, vaVe: 0 },
        byCategory: { lesson_learn: [], best_practice: [], va_ve: [] },
        hasMore: false,
      })}
      projectId={PROJECT_ID}
    />,
  );

  assert.ok(screen.getByText("Belum ada knowledge untuk proyek ini"));
});
