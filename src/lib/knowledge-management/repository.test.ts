import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { insertKnowledgeEntry } from "./repository";

// A new record has never been edited, so updated_by must stay NULL (design
// G.3/H.7) and the timestamps are left to the single INSERT statement so
// updated_at equals created_at until the first real update.
describe("insertKnowledgeEntry defaults", () => {
  it("stores updated_by as null and version 1 without overriding timestamps", async () => {
    const captured: Array<Record<string, unknown>> = [];
    const db = {
      insert: () => ({
        values: (values: Record<string, unknown>) => {
          captured.push(values);
          return { returning: async () => [{ id: "entry-1" }] };
        },
      }),
    };

    const id = await insertKnowledgeEntry(
      {
        projectId: "11111111-1111-4111-8111-111111111111",
        knowledgeType: "lesson_learn",
        content: "Ringkasan pekerjaan.",
        createdBy: "22222222-2222-4222-8222-222222222222",
      },
      db as never,
    );

    assert.equal(id, "entry-1");
    assert.equal(captured.length, 1);
    const values = captured[0] ?? {};
    assert.equal(values.updatedBy, null);
    assert.equal(values.version, 1);
    assert.equal(values.createdBy, "22222222-2222-4222-8222-222222222222");
    assert.equal("createdAt" in values, false);
    assert.equal("updatedAt" in values, false);
  });
});
