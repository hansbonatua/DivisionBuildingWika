import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCompleteReorder } from "@/lib/metode-kerja-standar/service";

describe("metode kerja reorder completeness", () => {
  it("accepts an exact permutation of all current children", () => {
    assert.equal(isCompleteReorder(["a", "b", "c"], ["c", "a", "b"]), true);
  });

  it("rejects missing, extra or duplicate children", () => {
    assert.equal(isCompleteReorder(["a", "b", "c"], ["a", "b"]), false);
    assert.equal(isCompleteReorder(["a", "b"], ["a", "b", "c"]), false);
    assert.equal(isCompleteReorder(["a", "b"], ["a", "a"]), false);
    assert.equal(isCompleteReorder(["a", "b"], ["a", "c"]), false);
  });
});
