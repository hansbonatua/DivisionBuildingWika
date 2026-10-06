import { NextResponse } from "next/server";
import * as greenBuildingService from "@/lib/green-buildings/green-building.service";

// Public landing feed: Published certificates only, display fields only. No auth needed.
export async function GET() {
  try {
    const certificates = await greenBuildingService.listPublicCertificates();
    return NextResponse.json({ data: certificates });
  } catch (error) {
    console.error("GET /api/green-buildings/public failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
