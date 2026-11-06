import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { replacePics } from "@/lib/metode-kerja-standar/repository";

const ITEM_ID = "11111111-1111-4111-8111-111111111111";
const SUB_ID = "22222222-2222-4222-8222-222222222222";
const USER_A = "33333333-3333-4333-8333-333333333333";
const USER_B = "44444444-4444-4444-8444-444444444444";

describe("metode kerja replacePics", () => {
  it("deletes the target assignments then inserts the new PIC rows", async () => {
    let deleteCalls = 0;
    let inserted: unknown;
    const db = {
      delete: () => ({
        where: async () => {
          deleteCalls += 1;
        },
      }),
      insert: () => ({
        values: async (values: unknown) => {
          inserted = values;
        },
      }),
    };

    await replacePics({ itemId: ITEM_ID }, [USER_A, USER_B], db as never);

    assert.equal(deleteCalls, 1);
    assert.deepEqual(inserted, [
      { subKategoriId: null, itemId: ITEM_ID, userId: USER_A },
      { subKategoriId: null, itemId: ITEM_ID, userId: USER_B },
    ]);
  });

  it("supports sub-kategori targets and clears the list when empty", async () => {
    let deleteCalls = 0;
    let insertCalls = 0;
    const db = {
      delete: () => ({
        where: async () => {
          deleteCalls += 1;
        },
      }),
      insert: () => ({
        values: async () => {
          insertCalls += 1;
        },
      }),
    };

    await replacePics({ subKategoriId: SUB_ID }, [], db as never);

    assert.equal(deleteCalls, 1);
    assert.equal(insertCalls, 0);
  });

  it("rejects a target with both or neither id", async () => {
    await assert.rejects(
      () =>
        replacePics(
          { subKategoriId: SUB_ID, itemId: ITEM_ID } as never,
          [],
          {} as never,
        ),
      /exactly one/,
    );
    await assert.rejects(
      () => replacePics({} as never, [], {} as never),
      /exactly one/,
    );
  });
});
