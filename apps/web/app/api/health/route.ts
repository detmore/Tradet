import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { botSettings } from "@trade/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.select({ id: botSettings.id }).from(botSettings).limit(1);
    return NextResponse.json({ status: "ok", service: "web", ts: Date.now() });
  } catch {
    return NextResponse.json({ status: "error", service: "web" }, { status: 503 });
  }
}
