import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createProjectGreenCertificateSchema,
  greenBuildingCertificateListQuerySchema,
} from "@/lib/green-building-esg/schema";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    project_id: PROJECT_ID,
    project_value: "Rp 1.250.000.000",
    location: "Jakarta",
    certificate_year: 2026,
    lembaga: "BGH",
    level: "Utama",
    status: "Certified",
    ...overrides,
  };
}

describe("green building certificate input contract", () => {
  it("normalizes an empty documentation URL to null", () => {
    const parsed = createProjectGreenCertificateSchema.parse(
      validPayload({ documentation_url: "  " }),
    );
    assert.equal(parsed.documentation_url, null);
    assert.equal(parsed.project_id, PROJECT_ID);
    assert.equal(parsed.certificate_year, 2026);
  });

  it("requires the level to match the lembaga", () => {
    assert.equal(
      createProjectGreenCertificateSchema.safeParse(
        validPayload({ lembaga: "BGH", level: "Platinum" }),
      ).success,
      false,
    );
    assert.equal(
      createProjectGreenCertificateSchema.safeParse(
        validPayload({ lembaga: "Greenship", level: "Certified/Bronze" }),
      ).success,
      true,
    );
    assert.equal(
      createProjectGreenCertificateSchema.safeParse(
        validPayload({ lembaga: "Greenship", level: "Gold" }),
      ).success,
      true,
    );
  });

  it("accepts only absolute http(s) documentation URLs without whitespace", () => {
    for (const documentationUrl of [
      "https://example.com/sertifikat",
      "http://example.com/sertifikat",
    ]) {
      assert.equal(
        createProjectGreenCertificateSchema.safeParse(
          validPayload({ documentation_url: documentationUrl }),
        ).success,
        true,
        documentationUrl,
      );
    }
    for (const documentationUrl of [
      "javascript:alert(1)",
      "ftp://example.com/a",
      "example.com/a",
      "https://example.com/a b",
    ]) {
      assert.equal(
        createProjectGreenCertificateSchema.safeParse(
          validPayload({ documentation_url: documentationUrl }),
        ).success,
        false,
        documentationUrl,
      );
    }
  });

  it("rejects audit fields and out-of-range values", () => {
    assert.equal(
      createProjectGreenCertificateSchema.safeParse(
        validPayload({ created_by: PROJECT_ID }),
      ).success,
      false,
    );
    assert.equal(
      createProjectGreenCertificateSchema.safeParse(
        validPayload({ certificate_year: 1999 }),
      ).success,
      false,
    );
    assert.equal(
      createProjectGreenCertificateSchema.safeParse(
        validPayload({ project_value: " " }),
      ).success,
      false,
    );
  });

  it("coerces the optional year query while keeping search optional", () => {
    const parsed = greenBuildingCertificateListQuerySchema.parse({
      year: "2026",
      search: " gedung ",
    });
    assert.equal(parsed.year, 2026);
    assert.equal(parsed.search, "gedung");
    assert.equal(greenBuildingCertificateListQuerySchema.parse({}).year, undefined);
  });
});
