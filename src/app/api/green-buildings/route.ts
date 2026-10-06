import { NextResponse } from "next/server";
import { createGreenBuildingSchema } from "@/lib/green-buildings/green-building.schema";
import * as greenBuildingService from "@/lib/green-buildings/green-building.service";
import { serializeGreenBuildingCertificateDocument } from "@/lib/green-buildings/green-building.types";

// NOTE: temporarily unauthenticated (dev stage). Add auth checks here later.

export async function GET() {
  try {
    const certificates = await greenBuildingService.listCertificates();
    return NextResponse.json({ data: certificates.map(serializeGreenBuildingCertificateDocument) });
  } catch (error) {
    console.error("GET /api/green-buildings failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
    const created = await greenBuildingService.createCertificate(parsed.data);
    return NextResponse.json({ data: serializeGreenBuildingCertificateDocument(created) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/green-buildings failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
