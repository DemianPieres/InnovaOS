import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check para hosting (Render). No toca la DB para evitar costos extra.
 */
export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "innovaos",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
