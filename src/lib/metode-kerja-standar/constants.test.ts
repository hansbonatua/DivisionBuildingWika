import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DISIPLIN_CODES,
  DISIPLIN_LIST,
  getDisiplinByCode,
  getDisiplinBySlug,
  isDisiplinCode,
} from "@/lib/metode-kerja-standar/constants";

describe("metode kerja disiplin constants", () => {
  it("defines exactly six canonical disciplines in order", () => {
    assert.deepEqual([...DISIPLIN_CODES], ["A", "B", "C", "D", "E", "F"]);
    assert.deepEqual(
      DISIPLIN_LIST.map((item) => item.name),
      [
        "Struktur",
        "Arsitektur",
        "MEP",
        "Landscape, Hardscape, Infrastructure",
        "Site Management",
        "Lainnya",
      ],
    );
  });

  it("keeps F. Lainnya present and every slug unique", () => {
    const slugs = new Set(DISIPLIN_LIST.map((item) => item.slug));
    assert.equal(slugs.size, DISIPLIN_LIST.length);
    assert.equal(getDisiplinByCode("F")?.name, "Lainnya");
  });

  it("looks up by normalized code and exact slug", () => {
    assert.equal(getDisiplinByCode(" a ")?.code, "A");
    assert.equal(getDisiplinBySlug("c-mep")?.code, "C");
    assert.equal(getDisiplinBySlug("a-struktur")?.name, "Struktur");
    assert.equal(getDisiplinBySlug("unknown"), null);
    assert.equal(isDisiplinCode("f"), true);
    assert.equal(isDisiplinCode("G"), false);
  });
});
