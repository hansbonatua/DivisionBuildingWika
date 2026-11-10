import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BERKAS_STATUS_LABELS,
  berkasStatusNote,
  canSignBerkas,
  type BerkasAssignmentDto,
} from "./types";

function assignment(overrides: Partial<BerkasAssignmentDto> = {}): BerkasAssignmentDto {
  return {
    berkasId: "berkas-1",
    urutan: 1,
    ttdUploadedAt: null,
    ...overrides,
  };
}

test("canSignBerkas only enables the validator whose turn it is", () => {
  assert.equal(canSignBerkas("MENUNGGU_TTD_1", assignment({ urutan: 1 })), true);
  assert.equal(canSignBerkas("MENUNGGU_TTD_1", assignment({ urutan: 2 })), false);
  assert.equal(canSignBerkas("MENUNGGU_TTD_2", assignment({ urutan: 1 })), false);
  assert.equal(canSignBerkas("MENUNGGU_TTD_2", assignment({ urutan: 2 })), true);
});

test("canSignBerkas hides the action after a signature or without assignment", () => {
  assert.equal(
    canSignBerkas(
      "MENUNGGU_TTD_1",
      assignment({ urutan: 1, ttdUploadedAt: "2026-11-10T00:00:00.000Z" }),
    ),
    false,
  );
  assert.equal(canSignBerkas("MENUNGGU_TTD_1", null), false);
});

test("status labels and notes cover completion", () => {
  assert.equal(BERKAS_STATUS_LABELS.SELESAI, "Selesai");
  assert.match(berkasStatusNote("SELESAI"), /final/i);
});
