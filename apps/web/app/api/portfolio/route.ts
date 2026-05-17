import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { positions, equitySnapshots, botSettings } from "@trade/db";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function fetchCurrentPrices(symbols: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  await Promise.all(
    symbols.map(async (sym) => {
      try {
        const res = await fetch(
          `https://api.binance.com/api/v3/ticker/price?symbol=${sym}`,
          { cache: "no-store" }
        );
        const data = await res.json() as { price: string };
        prices[sym] = parseFloat(data.price);
      } catch {
        prices[sym] = 0;
      }
    })
  );
  return prices;
}

export async function GET() {
  try {
    const [settings] = await db.select().from(botSettings).limit(1);
    const mode = settings?.mode ?? "paper";

    const openPositions = await db
      .select()
      .from(positions)
      .where(and(eq(positions.mode, mode), eq(positions.status, "open")))
      .orderBy(desc(positions.openedAt));

    const equityHistory = await db
      .select()
      .from(equitySnapshots)
      .where(eq(equitySnapshots.mode, mode))
      .orderBy(desc(equitySnapshots.takenAt))
      .limit(100);

    const availableBalance = parseFloat(
      mode === "live"
        ? (settings?.liveCurrentBalance ?? "0")
        : (settings?.paperCurrentBalance ?? "0")
    );

    // Fetch live prices for open positions
    const symbols = [...new Set(openPositions.map((p) => p.symbol))];
    const prices = symbols.length > 0 ? await fetchCurrentPrices(symbols) : {};

    // Enrich positions with current price + unrealized P&L
    const enrichedPositions = openPositions.map((p) => {
      const currentPrice = prices[p.symbol] ?? 0;
      const qty = parseFloat(p.qty);
      const entry = parseFloat(p.avgEntry);
      const unrealizedPnl = currentPrice > 0 ? (currentPrice - entry) * qty : 0;
      const positionValue = currentPrice > 0 ? qty * currentPrice : qty * entry;
      return {
        ...p,
        currentPrice: currentPrice.toFixed(8),
        unrealizedPnl: unrealizedPnl.toFixed(8),
        positionValue: positionValue.toFixed(8),
      };
    });

    const totalPositionValue = enrichedPositions.reduce(
      (sum, p) => sum + parseFloat(p.positionValue),
      0
    );
    const totalUnrealizedPnl = enrichedPositions.reduce(
      (sum, p) => sum + parseFloat(p.unrealizedPnl),
      0
    );
    const totalValue = availableBalance + totalPositionValue;

    return NextResponse.json({
      openPositions: enrichedPositions,
      equityHistory: equityHistory.reverse(),
      availableBalance: availableBalance.toFixed(8),
      totalPositionValue: totalPositionValue.toFixed(8),
      totalUnrealizedPnl: totalUnrealizedPnl.toFixed(8),
      totalValue: totalValue.toFixed(8),
      mode,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 });
  }
}
