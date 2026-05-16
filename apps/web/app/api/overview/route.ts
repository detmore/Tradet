import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { botSettings, equitySnapshots, trades, positions, alerts } from "@trade/db";
import { eq, desc, gte, sql, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

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

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayTrades = await db
      .select({ realizedPnl: trades.realizedPnl })
      .from(trades)
      .where(and(eq(trades.mode, mode), gte(trades.closedAt, todayStart)));

    const todayPnl = todayTrades.reduce((sum, t) => sum + parseFloat(t.realizedPnl), 0);

    const openPositionCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(positions)
      .where(and(eq(positions.mode, mode), eq(positions.status, "open")));

    const recentAlerts = await db
      .select()
      .from(alerts)
      .orderBy(desc(alerts.sentAt))
      .limit(5);

    const equityHistory = await db
      .select({
        takenAt: equitySnapshots.takenAt,
        totalBalance: equitySnapshots.totalBalance,
      })
      .from(equitySnapshots)
      .where(eq(equitySnapshots.mode, mode))
      .orderBy(desc(equitySnapshots.takenAt))
      .limit(50);

    return NextResponse.json({
      settings: settings ?? null,
      latestEquity: latestEquity ?? null,
      todayPnl: todayPnl.toFixed(2),
      openPositionCount: Number(openPositionCount[0]?.count ?? 0),
      recentAlerts,
      equityHistory: equityHistory.reverse(),
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch overview" }, { status: 500 });
  }
}
