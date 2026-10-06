import { NextResponse } from "next/server";
import * as clientService from "@/lib/clients/client.service";

// Public landing feed: active clients only, display fields only. No auth needed.
export async function GET() {
  try {
    const clients = await clientService.listPublicClients();
    return NextResponse.json({ data: clients });
  } catch (error) {
    console.error("GET /api/clients/public failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
