import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trades, botSettings } from "@trade/db";
import { desc, gte, and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") ?? "all";

    const [settings] = await db.select({ mode: botSettings.mode }).from(botSettings).limit(1);
    const mode = settings?.mode ?? "paper";

    const conditions = [eq(trades.mode, mode)];
    const now = new Date();

    if (range === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      conditions.push(gte(trades.closedAt, start));
    } else if (range === "7d") {
      conditions.push(gte(trades.closedAt, new Date(now.getTime() - 7 * 86_400_000)));
    } else if (range === "30d") {
      conditions.push(gte(trades.closedAt, new Date(now.getTime() - 30 * 86_400_000)));
    } else if (range === "90d") {
      conditions.push(gte(trades.closedAt, new Date(now.getTime() - 90 * 86_400_000)));
    }

    const rows = await db
      .select()
      .from(trades)
      .where(and(...conditions))
      .orderBy(desc(trades.closedAt))
      .limit(500);

    return NextResponse.json({ trades: rows });
  } catch {
    return NextResponse.json({ error: "Failed to fetch trades" }, { status: 500 });
  }
}
