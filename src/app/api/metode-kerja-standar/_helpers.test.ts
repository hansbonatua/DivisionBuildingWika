import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { MetodeKerjaForbiddenError } from "@/lib/metode-kerja-standar/access";
import {
  MetodeKerjaConflictError,
  MetodeKerjaNotFoundError,
  MetodeKerjaValidationError,
} from "@/lib/metode-kerja-standar/service";
import {
  invalidIdResponse,
  isUuid,
  mapDomainError,
  parseJsonBody,
} from "./_helpers";

const BODY_SCHEMA = z.object({ name: z.string().min(1, "Nama wajib") }).strict();

function jsonRequest(body: string): Request {
  return new Request("http://localhost/api/metode-kerja-standar/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("metode kerja API helper", () => {
  it("accepts canonical UUIDs and rejects malformed IDs", () => {
    assert.equal(isUuid("11111111-1111-4111-8111-111111111111"), true);
    assert.equal(isUuid("not-a-uuid"), false);
    assert.equal(isUuid("11111111-1111-4111-8111-11111111111"), false);
    assert.equal(invalidIdResponse().status, 400);
  });

  it("parses a valid JSON body and rejects invalid JSON/schema", async () => {
    await assert.doesNotReject(async () => {
      const parsed = await parseJsonBody(
        jsonRequest(JSON.stringify({ name: "A" })),
        BODY_SCHEMA,
      );
      assert.deepEqual(parsed, { name: "A" });
    });

    await assert.rejects(
      () => parseJsonBody(jsonRequest("{"), BODY_SCHEMA),
      MetodeKerjaValidationError,
    );
    await assert.rejects(
      () => parseJsonBody(jsonRequest(JSON.stringify({})), BODY_SCHEMA),
      z.ZodError,
    );

    const failure = BODY_SCHEMA.safeParse({});
    assert.equal(failure.success, false);
    if (!failure.success) {
      assert.equal(mapDomainError(failure.error)?.status, 400);
    }
  });

  it("maps domain and PostgreSQL errors to HTTP responses", () => {
    assert.equal(
      mapDomainError(new MetodeKerjaForbiddenError())?.status,
      403,
    );
    assert.equal(mapDomainError(new MetodeKerjaNotFoundError())?.status, 404);
    assert.equal(
      mapDomainError(new MetodeKerjaConflictError("conflict"))?.status,
      409,
    );
    assert.equal(
      mapDomainError(new MetodeKerjaValidationError("invalid"))?.status,
      400,
    );
    assert.equal(mapDomainError({ code: "23505" })?.status, 409);
    assert.equal(mapDomainError({ code: "23503" })?.status, 409);
    assert.equal(mapDomainError({ code: "23001" })?.status, 409);
    assert.equal(mapDomainError({ code: "23514" })?.status, 400);
    assert.equal(mapDomainError(new Error("unmapped")), null);
  });
});
