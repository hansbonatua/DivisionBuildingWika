import test from "node:test";
import assert from "node:assert/strict";
import {
  filterPicOptions,
  mergePicOptions,
  picOptionLabel,
  togglePicId,
  type PicOption,
} from "@/components/dashboard/metode-kerja-standar/PicMultiSelect";

function option(overrides: Partial<PicOption> = {}): PicOption {
  return {
    user_id: "u-1",
    name: "Budi",
    status: "active",
    position: "Site Engineer",
    ...overrides,
  };
}

test("mergePicOptions keeps one entry per user and lets the server win", () => {
  const merged = mergePicOptions(
    [option({ user_id: "u-1", name: "Budi Lama" }), option({ user_id: "u-2", name: "Sari" })],
    [option({ user_id: "u-1", name: "Budi Baru" }), option({ user_id: "u-3", name: "Ani" })],
  );

  assert.equal(merged.length, 3);
  assert.equal(merged.find((row) => row.user_id === "u-1")?.name, "Budi Baru");
  assert.deepEqual(
    merged.map((row) => row.user_id).sort(),
    ["u-1", "u-2", "u-3"],
  );
});

test("filterPicOptions matches name or position and ignores case", () => {
  const options = [
    option({ user_id: "u-1", name: "Budi", position: "Site Engineer" }),
    option({ user_id: "u-2", name: "Sari", position: "QA/QC" }),
  ];

  assert.deepEqual(
    filterPicOptions(options, "sari").map((row) => row.user_id),
    ["u-2"],
  );
  assert.deepEqual(
    filterPicOptions(options, "engineer").map((row) => row.user_id),
    ["u-1"],
  );
  assert.equal(filterPicOptions(options, "   ").length, 2);
  assert.equal(filterPicOptions(options, "tidak ada").length, 0);
});

test("togglePicId adds and removes without mutating the input", () => {
  const source = ["u-1"];

  assert.deepEqual(togglePicId(source, "u-2"), ["u-1", "u-2"]);
  assert.deepEqual(togglePicId(source, "u-1"), []);
  assert.deepEqual(source, ["u-1"]);
});

test("picOptionLabel marks suspended PIC as non-aktif", () => {
  assert.equal(picOptionLabel(option()), "Budi");
  assert.equal(
    picOptionLabel(option({ status: "suspended" })),
    "Budi (non-aktif)",
  );
});
