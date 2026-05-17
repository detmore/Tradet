import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { botSettings, equitySnapshots, trades, positions, alerts } from "@trade/db";
import { eq, desc, gte, sql, and, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function fetchPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json() as { price?: string };
    const p = parseFloat(data.price ?? "");
    return isNaN(p) || p <= 0 ? null : p;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const [settings] = await db.select().from(botSettings).limit(1);
    const mode = settings?.mode ?? "paper";

    const [latestEquity] = await db
      .select()
      .from(equitySnapshots)
      .where(eq(equitySnapshots.mode, mode))
      .orderBy(desc(equitySnapshots.takenAt))
      .limit(1);

    // First equity snapshot — used as all-time starting reference
    const [firstEquity] = await db
      .select({ totalBalance: equitySnapshots.totalBalance })
      .from(equitySnapshots)
      .where(eq(equitySnapshots.mode, mode))
      .orderBy(asc(equitySnapshots.takenAt))
      .limit(1);

    const todayStart = new Date(
      new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" }) + "T00:00:00+03:00"
    );

    const todayTrades = await db
      .select({ realizedPnl: trades.realizedPnl })
      .from(trades)
      .where(and(eq(trades.mode, mode), gte(trades.closedAt, todayStart)));

    const todayPnl = todayTrades.reduce((sum, t) => sum + parseFloat(t.realizedPnl), 0);

    const openPositionCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(positions)
      .where(and(eq(positions.mode, mode), eq(positions.status, "open")));

    // Compute live unrealized PnL for open positions
    const openPos = await db
      .select({ symbol: positions.symbol, qty: positions.qty, avgEntry: positions.avgEntry })
      .from(positions)
      .where(and(eq(positions.mode, mode), eq(positions.status, "open")));

    let liveUnrealizedPnl: number | null = null;
    if (openPos.length > 0) {
      const symbols = [...new Set(openPos.map((p) => p.symbol))];
      const priceMap: Record<string, number | null> = {};
      await Promise.all(symbols.map(async (s) => { priceMap[s] = await fetchPrice(s); }));

      let total = 0;
      let hasAny = false;
      for (const p of openPos) {
        const px = priceMap[p.symbol];
        if (px !== null && px !== undefined) {
          total += (px - parseFloat(p.avgEntry)) * parseFloat(p.qty);
          hasAny = true;
        }
      }
      if (hasAny) liveUnrealizedPnl = total;
    }

    const recentAlerts = await db
      .select()
      .from(alerts)
      .orderBy(desc(alerts.sentAt))
      .limit(5);

    const equityHistory = await db
      .select({ takenAt: equitySnapshots.takenAt, totalBalance: equitySnapshots.totalBalance })
      .from(equitySnapshots)
      .where(eq(equitySnapshots.mode, mode))
      .orderBy(desc(equitySnapshots.takenAt))
      .limit(50);

    return NextResponse.json({
      settings: settings ?? null,
      latestEquity: latestEquity ?? null,
      firstEquityBalance: firstEquity?.totalBalance ?? null,
      liveUnrealizedPnl: liveUnrealizedPnl !== null ? liveUnrealizedPnl.toFixed(8) : null,
      todayPnl: todayPnl.toFixed(2),
      openPositionCount: Number(openPositionCount[0]?.count ?? 0),
      recentAlerts,
      equityHistory: equityHistory.reverse(),
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch overview" }, { status: 500 });
  }
}
