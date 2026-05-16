import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { strategyRuns, trades, positions, botSettings } from "@trade/db";
import { desc, eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol") ?? "BTC/USDT";

    const [settings] = await db.select({ mode: botSettings.mode }).from(botSettings).limit(1);
    const mode = settings?.mode ?? "paper";

    // Latest decision (not mode-specific — strategy runs are mode-agnostic)
    const [latestRun] = await db
      .select()
      .from(strategyRuns)
      .where(eq(strategyRuns.symbol, symbol))
      .orderBy(desc(strategyRuns.evaluatedAt))
      .limit(1);

    // Recent trades for this symbol filtered by current mode
    const recentTrades = await db
      .select()
      .from(trades)
      .where(and(eq(trades.symbol, symbol), eq(trades.mode, mode)))
      .orderBy(desc(trades.closedAt))
      .limit(20);

    // Open position for this symbol filtered by current mode
    const [openPosition] = await db
      .select()
      .from(positions)
      .where(and(eq(positions.symbol, symbol), eq(positions.mode, mode), eq(positions.status, "open")))
      .limit(1);

    return NextResponse.json({
      symbol,
      latestRun: latestRun ?? null,
      recentTrades,
      openPosition: openPosition ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch market data" },
      { status: 500 }
    );
  }
}
