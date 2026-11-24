import assert from "node:assert/strict";
import { test } from "node:test";
import { engDbCompletionPercent } from "./EngDbCompletionChart";

test("persentase kelengkapan = komponen tersedia / 6 × 100", () => {
  assert.equal(engDbCompletionPercent(0, 6), 0);
  assert.equal(engDbCompletionPercent(3, 6), 50);
  assert.equal(engDbCompletionPercent(6, 6), 100);
});

test("persentase dibulatkan dan dijepit ke 0..100", () => {
  assert.equal(engDbCompletionPercent(1, 6), 17);
  assert.equal(engDbCompletionPercent(2, 6), 33);
  assert.equal(engDbCompletionPercent(9, 6), 100);
  assert.equal(engDbCompletionPercent(-2, 6), 0);
});

test("tanpa komponen total tidak ada data", () => {
  assert.equal(engDbCompletionPercent(0, 0), 0);
  assert.equal(engDbCompletionPercent(3, Number.NaN), 0);
});
