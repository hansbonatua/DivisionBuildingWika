import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPermittedActor } from "@/lib/auth/require-permission";
import { mapCmsImageError } from "@/lib/cms/error-response";
import { OrganizationStructureForbiddenError } from "@/lib/organization-structure/access";
import { replaceOrganizationStructureSchema } from "@/lib/organization-structure/schema";
import * as organizationStructureService from "@/lib/organization-structure/service";

// Struktur Organisasi API — ONE resource, so ONE route file (same shape as
// /api/msl/note rather than a collection + [id] pair).
//
//   GET    → every canonical role (VIEW)
//   PUT    → Admin only (MANAGE); replaces or creates the single chart
//   DELETE → Admin only (MANAGE); removes it, so GET returns null again
//
// The actor always comes from the server session, never from the body. Both
// mutation verbs assert the permission here AND again inside the service, so a
// skipped route guard still cannot mutate anything.

function mapDomainError(error: unknown): NextResponse | null {
  if (error instanceof OrganizationStructureForbiddenError) {
    return NextResponse.json({ error: { message: error.message } }, { status: 403 });
  }
  if (error instanceof organizationStructureService.OrganizationStructureNotFoundError) {
    return NextResponse.json({ error: { message: error.message } }, { status: 404 });
  }
  // Uploaded-object verification (400) plus storage configuration/availability
  // (503/502) are never an opaque 500.
  return mapCmsImageError(error);
}

export async function GET() {
  try {
    const auth = await getPermittedActor(PERMISSIONS.ORGANIZATION_STRUCTURE_VIEW);
    if ("response" in auth) return auth.response;

    const data = await organizationStructureService.getOrganizationStructure(
      auth.actor,
    );
    // `data: null` is the documented "belum tersedia" state — not an error.
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/organization-structure failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.ORGANIZATION_STRUCTURE_MANAGE);
    if ("response" in auth) return auth.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { message: "Body harus berupa JSON yang valid" } },
        { status: 400 },
      );
    }

    const parsed = replaceOrganizationStructureSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            message: "Validasi gagal",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    try {
      const data = await organizationStructureService.replaceOrganizationStructure(
        auth.actor,
        parsed.data,
      );
      return NextResponse.json({ data }, { status: 200 });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("PUT /api/organization-structure failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const auth = await getPermittedActor(PERMISSIONS.ORGANIZATION_STRUCTURE_MANAGE);
    if ("response" in auth) return auth.response;

    try {
      const data = await organizationStructureService.deleteOrganizationStructure(
        auth.actor,
      );
      return NextResponse.json({ data }, { status: 200 });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("DELETE /api/organization-structure failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
