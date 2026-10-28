import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPermittedActor, mapPermissionError } from "@/lib/auth/require-permission";
import { mapCmsImageError } from "@/lib/cms/error-response";
import { createGreenBuildingSchema } from "@/lib/green-buildings/green-building.schema";
import * as greenBuildingService from "@/lib/green-buildings/green-building.service";
import { serializeGreenBuildingCertificateDocument } from "@/lib/green-buildings/green-building.types";

// Landing Page CMS management API — ADMIN ONLY (CMS_MANAGE).
// The public landing feed lives at /api/green-buildings/public and stays
// unauthenticated.

export async function GET() {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
    if ("response" in auth) return auth.response;
    const certificates = await greenBuildingService.listCertificates(auth.actor);
    return NextResponse.json({ data: certificates.map(serializeGreenBuildingCertificateDocument) });
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    console.error("GET /api/green-buildings failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
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
    const parsed = createGreenBuildingSchema.safeParse(body);
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
    const created = await greenBuildingService.createCertificate(parsed.data, auth.actor);
    return NextResponse.json(
      { data: serializeGreenBuildingCertificateDocument(created) },
      { status: 201 },
    );
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    // Uploaded-image verification and CMS store failures are client/storage
    // problems, never an opaque 500.
    const cmsImageError = mapCmsImageError(error);
    if (cmsImageError) return cmsImageError;
    console.error("POST /api/green-buildings failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
