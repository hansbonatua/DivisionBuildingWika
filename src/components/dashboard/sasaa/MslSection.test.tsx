import assert from "node:assert/strict";
import { afterEach, test, mock } from "node:test";
import { JSDOM } from "jsdom";
import { createElement, type ReactNode } from "react";

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

// recharts is replaced before MslSection (and therefore MonthlyBarChart) is
// required: ResponsiveContainer needs a measured layout that jsdom does not
// have. The stub renders the exact data array the chart would plot, so the
// assertion is on the real props, not on SVG output.
/* eslint-disable @typescript-eslint/no-require-imports */
const rechartsId = require.resolve("recharts");
type StubProps = { data?: unknown; children?: ReactNode };
require.cache[rechartsId] = {
  id: rechartsId,
  filename: rechartsId,
  loaded: true,
  exports: {
    Bar: () => null,
    BarChart: ({ data, children }: StubProps) =>
      createElement("div", { "data-chart": JSON.stringify(data) }, children),
    CartesianGrid: () => null,
    Cell: () => null,
    ResponsiveContainer: ({ children }: StubProps) =>
      createElement("div", null, children),
    Tooltip: () => null,
    XAxis: () => null,
    YAxis: () => null,
  },
} as never;

const { cleanup, fireEvent, render, screen } =
  require("@testing-library/react") as typeof import("@testing-library/react");
const { default: MslSection } =
  require("./MslSection") as typeof import("./MslSection");
/* eslint-enable @typescript-eslint/no-require-imports */

import type { SasaaEngDbStatus, SasaaMslMonths } from "./types";

afterEach(() => {
  cleanup();
  mock.restoreAll();
});

function mslFixture(): SasaaMslMonths[] {
  return Array.from({ length: 12 }, (_, index) => ({
    total: index === 0 ? 3 : 0,
    engineeringValue: index === 0 ? 4 : 0,
    metodeKerja: index === 0 ? 2 : 0,
    engineeringExecution: index === 0 ? 1 : 0,
  }));
}

const ENG_DB: SasaaEngDbStatus = {
  covered: 4,
  total: 6,
  categories: [
    { category: "ENGINEERING_DRAWING", covered: true },
    { category: "ENGINEERING_DESIGN_REPORT", covered: false },
    { category: "METODE_PELAKSANAAN_PEKERJAAN", covered: true },
    { category: "SPESIFIKASI_TEKNIS", covered: true },
    { category: "PROJECT_MASTER_SCHEDULE", covered: false },
    { category: "BIM", covered: true },
  ],
};

type ChartDatum = { month: number; value: number };

function plottedValues(): ChartDatum[] {
  const node = document.querySelector("[data-chart]");
  assert.ok(node, "chart stub was not rendered");
  return JSON.parse(node.getAttribute("data-chart") ?? "[]") as ChartDatum[];
}

test("renders the four component options and the Eng DB coverage", () => {
  render(<MslSection msl={mslFixture()} engDb={ENG_DB} />);

  for (const label of [
    "Total",
    "Engineering Value",
    "Metode Kerja",
    "Eng Execution",
  ]) {
    assert.ok(screen.getByText(label));
  }

  assert.ok(screen.getByText("4/6 ✅"));
  assert.ok(screen.getByText("Engineering Drawing"));
  assert.ok(screen.getByText("BIM"));
  assert.equal(screen.queryByText("Engineering Design Report"), null);
});

test("choosing a component changes the plotted series", () => {
  render(<MslSection msl={mslFixture()} engDb={ENG_DB} />);

  const before = plottedValues();
  assert.equal(before.length, 12);
  assert.equal(before[0]?.value, 3);

  fireEvent.click(screen.getByText("Engineering Value"));

  const after = plottedValues();
  assert.equal(after.length, 12);
  assert.equal(after[0]?.value, 4);
  assert.equal(
    screen.getByText("Engineering Value").getAttribute("aria-pressed"),
    "true",
  );

  fireEvent.click(screen.getByText("Metode Kerja"));
  assert.equal(plottedValues()[0]?.value, 2);

  fireEvent.click(screen.getByText("Eng Execution"));
  assert.equal(plottedValues()[0]?.value, 1);
});
