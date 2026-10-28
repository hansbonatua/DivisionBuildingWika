import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPermittedActor, mapPermissionError } from "@/lib/auth/require-permission";
import { mapCmsImageError } from "@/lib/cms/error-response";
import { updateGreenBuildingSchema } from "@/lib/green-buildings/green-building.schema";
import * as greenBuildingService from "@/lib/green-buildings/green-building.service";
import { serializeGreenBuildingCertificateDocument } from "@/lib/green-buildings/green-building.types";

// Landing Page CMS management API — ADMIN ONLY (CMS_MANAGE).

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
    if ("response" in auth) return auth.response;
    const { id } = await context.params;
    if (!greenBuildingService.isValidGreenBuildingId(id)) {
      return NextResponse.json({ error: { message: "ID sertifikat tidak valid" } }, { status: 400 });
    }
    const certificate = await greenBuildingService.getCertificate(id, auth.actor);
    if (!certificate) {
      return NextResponse.json({ error: { message: "Sertifikat tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: serializeGreenBuildingCertificateDocument(certificate) });
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    console.error("GET /api/green-buildings/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
    if ("response" in auth) return auth.response;
    const { id } = await context.params;
    if (!greenBuildingService.isValidGreenBuildingId(id)) {
      return NextResponse.json({ error: { message: "ID sertifikat tidak valid" } }, { status: 400 });
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { message: "Body harus berupa JSON yang valid" } },
        { status: 400 },
      );
    }
    if (typeof body !== "object" || body === null || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: { message: "Body update tidak boleh kosong" } },
        { status: 400 },
      );
    }
    const parsed = updateGreenBuildingSchema.safeParse(body);
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
    const updated = await greenBuildingService.updateCertificate(id, parsed.data, auth.actor);
    if (!updated) {
      return NextResponse.json({ error: { message: "Sertifikat tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: serializeGreenBuildingCertificateDocument(updated) });
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    const cmsImageError = mapCmsImageError(error);
    if (cmsImageError) return cmsImageError;
    console.error("PATCH /api/green-buildings/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
    if ("response" in auth) return auth.response;
    const { id } = await context.params;
    if (!greenBuildingService.isValidGreenBuildingId(id)) {
      return NextResponse.json({ error: { message: "ID sertifikat tidak valid" } }, { status: 400 });
    }
    const deleted = await greenBuildingService.deleteCertificate(id, auth.actor);
    if (!deleted) {
      return NextResponse.json({ error: { message: "Sertifikat tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    const cmsImageError = mapCmsImageError(error);
    if (cmsImageError) return cmsImageError;
    console.error("DELETE /api/green-buildings/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
