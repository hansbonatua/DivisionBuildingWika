import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { UnauthenticatedError } from "@/lib/auth/current-user";
import {
  ProjectDocumentationConflictError,
  ProjectDocumentationForbiddenError,
  ProjectDocumentationNotFoundError,
  ProjectDocumentationValidationError,
} from "@/lib/project-documentation/service";
import { updateProjectDocumentationSchema } from "@/lib/project-documentation/schema";
import {
  isUuid,
  mapDomainError,
  parseJsonBody,
  parsePeriodPath,
  parsePeriodQuery,
  parseYearQuery,
} from "@/app/api/project-documentation/_helpers";

async function messageOf(response: Response): Promise<string> {
  const body = (await response.json()) as { error?: { message?: string } };
  return body.error?.message ?? "";
}

describe("PDOC mapDomainError", () => {
  it("maps unauthenticated to 401", async () => {
    const response = mapDomainError(new UnauthenticatedError());
    assert.ok(response);
    assert.equal(response.status, 401);
    assert.equal(await messageOf(response), "Unauthenticated");
  });

  it("maps forbidden, not-found, conflict and validation errors", () => {
    assert.equal(
      mapDomainError(new ProjectDocumentationForbiddenError())?.status,
      403,
    );
    assert.equal(
      mapDomainError(new ProjectDocumentationNotFoundError())?.status,
      404,
    );
    assert.equal(
      mapDomainError(new ProjectDocumentationConflictError("Konflik"))?.status,
      409,
    );
    assert.equal(
      mapDomainError(new ProjectDocumentationValidationError("Validasi"))?.status,
      400,
    );
  });

  it("maps SQLSTATE 23503, 23001 and 23505 to 409", () => {
    assert.equal(mapDomainError({ code: "23503" })?.status, 409);
    assert.equal(mapDomainError({ code: "23001" })?.status, 409);
    assert.equal(mapDomainError({ code: "23505" })?.status, 409);
  });

  it("reads SQLSTATE from a nested cause chain", () => {
    const error = { message: "query failed", cause: { code: "23503" } };
    assert.equal(mapDomainError(error)?.status, 409);
  });

  it("maps SQLSTATE 23514 to 400", () => {
    assert.equal(mapDomainError({ code: "23514" })?.status, 400);
  });

  it("maps Zod errors to 400 with field details", async () => {
    const parsed = updateProjectDocumentationSchema.safeParse({
      week_1_url: "ftp://example.com",
    });
    assert.equal(parsed.success, false);

    const response = mapDomainError(parsed.error);
    assert.ok(response);
    assert.equal(response.status, 400);
    assert.match(await messageOf(response), /http/);
  });

  it("returns null for unknown errors so the route can answer 500", () => {
    assert.equal(mapDomainError(new Error("boom")), null);
  });

  it("sets Cache-Control no-store on mapped responses", () => {
    const response = mapDomainError(new ProjectDocumentationNotFoundError());
    assert.equal(response?.headers.get("Cache-Control"), "no-store");
  });
});

describe("PDOC route id validation", () => {
  it("accepts canonical UUIDs", () => {
    assert.equal(isUuid("11111111-1111-4111-8111-111111111111"), true);
  });

  it("rejects malformed ids", () => {
    for (const value of ["", "abc", "1", "11111111-1111-4111-8111"]) {
      assert.equal(isUuid(value), false, value);
    }
  });
});

describe("PDOC period parsing", () => {
  it("parses list and summary query periods", () => {
    assert.deepEqual(
      parsePeriodQuery(
        new Request(
          "http://localhost/api/project-documentation?year=2026&month=01",
        ),
      ),
      { year: 2026, month: 1 },
    );
    assert.deepEqual(
      parsePeriodPath("2026", "12"),
      { year: 2026, month: 12 },
    );
    assert.equal(
      parseYearQuery(
        new Request(
          "http://localhost/api/project-documentation/summary?year=2026",
        ),
      ),
      2026,
    );
  });

  it("rejects missing, malformed and out-of-range periods", () => {
    for (const url of [
      "http://localhost/api/project-documentation",
      "http://localhost/api/project-documentation?year=26&month=1",
      "http://localhost/api/project-documentation?year=2026",
      "http://localhost/api/project-documentation?year=2026&month=0",
      "http://localhost/api/project-documentation?year=2026&month=13",
    ]) {
      assert.throws(
        () => parsePeriodQuery(new Request(url)),
        ProjectDocumentationValidationError,
        url,
      );
    }

    for (const [year, month] of [
      ["1999", "1"],
      ["2026", "0"],
      ["2026", "13"],
      ["abc", "1"],
    ]) {
      assert.throws(
        () => parsePeriodPath(year, month),
        ProjectDocumentationValidationError,
      );
    }

    assert.throws(
      () =>
        parseYearQuery(
          new Request(
            "http://localhost/api/project-documentation/summary?year=1999",
          ),
        ),
      ProjectDocumentationValidationError,
    );
  });

  it("rejects period fields in the update body", () => {
    const parsed = updateProjectDocumentationSchema.safeParse({
      year: 2026,
      month: 1,
    });
    assert.equal(parsed.success, false);
  });
});

describe("PDOC route layout", () => {
  it("uses only the period-scoped PUT route and exposes summary", () => {
    const root = process.cwd();
    const oldRoute = path.join(
      root,
      "src/app/api/project-documentation/[projectId]/route.ts",
    );
    const newRoute = path.join(
      root,
      "src/app/api/project-documentation/[projectId]/[year]/[month]/route.ts",
    );
    const summaryRoute = path.join(
      root,
      "src/app/api/project-documentation/summary/route.ts",
    );

    assert.equal(existsSync(oldRoute), false);
    assert.equal(existsSync(newRoute), true);
    assert.equal(existsSync(summaryRoute), true);
  });
});

describe("PDOC parseJsonBody", () => {
  it("parses and validates a JSON body", async () => {
    const request = new Request("http://localhost/api/project-documentation/x", {
      method: "PUT",
      body: JSON.stringify({ week_1_url: "https://example.com/week-1" }),
    });
    const parsed = await parseJsonBody(request, updateProjectDocumentationSchema);
    assert.equal(parsed.week_1_url, "https://example.com/week-1");
  });

  it("maps invalid JSON to a validation error", async () => {
    const request = new Request("http://localhost/api/project-documentation/x", {
      method: "PUT",
      body: "{not-json",
    });
    await assert.rejects(
      () => parseJsonBody(request, updateProjectDocumentationSchema),
      ProjectDocumentationValidationError,
    );
  });
});
