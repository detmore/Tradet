import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trades, botSettings } from "@trade/db";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [settings] = await db.select({ mode: botSettings.mode }).from(botSettings).limit(1);
    const mode = settings?.mode ?? "paper";

    const allTrades = await db
      .select({
        realizedPnl: trades.realizedPnl,
        closedAt: trades.closedAt,
        exitReason: trades.exitReason,
        entryPrice: trades.entryPrice,
        exitPrice: trades.exitPrice,
      })
      .from(trades)
      .where(eq(trades.mode, mode))
      .orderBy(desc(trades.closedAt));

    if (allTrades.length === 0) {
      return NextResponse.json({ stats: null, dailyPnl: {} });
    }

    const pnls = allTrades.map((t) => parseFloat(t.realizedPnl));
    const wins = pnls.filter((p) => p > 0);
    const losses = pnls.filter((p) => p < 0);
    const winRate = pnls.length > 0 ? (wins.length / pnls.length) * 100 : 0;
    const avgWin =
      wins.length > 0
        ? wins.reduce((a, b) => a + b, 0) / wins.length
        : 0;
    const avgLoss =
      losses.length > 0
        ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length)
        : 0;
    const expectancy =
      (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss;

    // Drawdown calculation (chronological order: oldest first)
    let peak = 0;
    let cumPnl = 0;
    let maxDrawdown = 0;
    for (const pnl of [...pnls].reverse()) {
      cumPnl += pnl;
      if (cumPnl > peak) peak = cumPnl;
      const dd = peak - cumPnl;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    // Daily PnL for heatmap
    const dailyPnl: Record<string, number> = {};
    for (const t of allTrades) {
      if (!t.closedAt) continue;
      const day = new Date(t.closedAt).toISOString().split("T")[0]!;
      dailyPnl[day] = (dailyPnl[day] ?? 0) + parseFloat(t.realizedPnl);
    }

    return NextResponse.json({
      stats: {
        totalTrades: pnls.length,
        winRate: winRate.toFixed(1),
        avgWin: avgWin.toFixed(2),
        avgLoss: avgLoss.toFixed(2),
        expectancy: expectancy.toFixed(2),
        maxDrawdown: maxDrawdown.toFixed(2),
        totalPnl: pnls.reduce((a, b) => a + b, 0).toFixed(2),
      },
      dailyPnl,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
