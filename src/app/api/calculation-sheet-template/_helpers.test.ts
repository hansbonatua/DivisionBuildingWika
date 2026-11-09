import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UnauthenticatedError } from "@/lib/auth/current-user";
import {
  CalculationSheetConflictError,
  CalculationSheetForbiddenError,
  CalculationSheetNotFoundError,
  CalculationSheetValidationError,
} from "@/lib/calculation-sheet-template/service";
import {
  isUuid,
  mapDomainError,
} from "@/app/api/calculation-sheet-template/_helpers";

async function messageOf(response: Response): Promise<string> {
  const body = (await response.json()) as { error?: { message?: string } };
  return body.error?.message ?? "";
}

describe("CST mapDomainError", () => {
  it("maps unauthenticated to 401", async () => {
    const response = mapDomainError(new UnauthenticatedError());
    assert.ok(response);
    assert.equal(response.status, 401);
    assert.equal(await messageOf(response), "Unauthenticated");
  });

  it("maps forbidden, not-found, conflict and validation errors", async () => {
    const forbidden = mapDomainError(new CalculationSheetForbiddenError());
    assert.equal(forbidden?.status, 403);

    const notFound = mapDomainError(new CalculationSheetNotFoundError());
    assert.equal(notFound?.status, 404);

    const conflict = mapDomainError(
      new CalculationSheetConflictError("Kode sudah dipakai pada kategori ini"),
    );
    assert.equal(conflict?.status, 409);

    const validation = mapDomainError(
      new CalculationSheetValidationError("PIC harus user dengan role Head Office"),
    );
    assert.equal(validation?.status, 400);
  });

  it("maps SQLSTATE 23505 and 23503 to 409", () => {
    assert.equal(mapDomainError({ code: "23505" })?.status, 409);
    assert.equal(mapDomainError({ code: "23503" })?.status, 409);
    assert.equal(mapDomainError({ code: "23001" })?.status, 409);
  });

  it("reads SQLSTATE from a nested cause chain", () => {
    const error = { message: "query failed", cause: { code: "23505" } };
    assert.equal(mapDomainError(error)?.status, 409);
  });

  it("maps SQLSTATE 23514 to 400", () => {
    assert.equal(mapDomainError({ code: "23514" })?.status, 400);
  });

  it("returns null for unknown errors so the route can answer 500", () => {
    assert.equal(mapDomainError(new Error("boom")), null);
  });

  it("sets Cache-Control no-store on mapped responses", () => {
    const response = mapDomainError(new CalculationSheetNotFoundError());
    assert.equal(response?.headers.get("Cache-Control"), "no-store");
  });
});

describe("CST route id validation", () => {
  it("accepts canonical UUIDs", () => {
    assert.equal(isUuid("11111111-1111-4111-8111-111111111111"), true);
  });

  it("rejects malformed ids", () => {
    for (const value of ["", "abc", "1", "11111111-1111-4111-8111"]) {
      assert.equal(isUuid(value), false, value);
    }
  });
});
