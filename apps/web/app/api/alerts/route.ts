import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { alerts } from "@trade/db";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.select().from(alerts).orderBy(desc(alerts.sentAt)).limit(200);
    return NextResponse.json({ alerts: rows });
  } catch {
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}
