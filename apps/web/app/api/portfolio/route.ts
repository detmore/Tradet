import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { positions, equitySnapshots, botSettings } from "@trade/db";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function fetchCurrentPrices(symbols: string[]): Promise<Record<string, number | null>> {
  const prices: Record<string, number | null> = {};
  await Promise.all(
    symbols.map(async (sym) => {
      try {
        const res = await fetch(
          `https://api.binance.com/api/v3/ticker/price?symbol=${sym}`,
          { cache: "no-store", signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) { prices[sym] = null; return; }
        const data = await res.json() as { price?: string };
        const p = parseFloat(data.price ?? "");
        prices[sym] = isNaN(p) || p <= 0 ? null : p;
      } catch {
        prices[sym] = null;
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

    const symbols = [...new Set(openPositions.map((p) => p.symbol))];
    const prices = symbols.length > 0 ? await fetchCurrentPrices(symbols) : {};

    const enrichedPositions = openPositions.map((p) => {
      const currentPrice = prices[p.symbol] ?? null;
      const qty = parseFloat(p.qty);
      const entry = parseFloat(p.avgEntry);
      const hasPrice = currentPrice !== null && currentPrice > 0;
      const unrealizedPnl = hasPrice ? (currentPrice! - entry) * qty : null;
      // position value: current market value if price known, else cost basis
      const positionValue = hasPrice ? qty * currentPrice! : qty * entry;
      return {
        ...p,
        currentPrice: hasPrice ? currentPrice!.toFixed(8) : null,
        unrealizedPnl: unrealizedPnl !== null ? unrealizedPnl.toFixed(8) : null,
        positionValue: positionValue.toFixed(8),
        priceFetched: hasPrice,
      };
    });

    const totalPositionValue = enrichedPositions.reduce(
      (sum, p) => sum + parseFloat(p.positionValue),
      0
    );
    // Only sum unrealized P&L for positions where we have a live price
    const totalUnrealizedPnl = enrichedPositions.reduce(
      (sum, p) => sum + (p.unrealizedPnl !== null ? parseFloat(p.unrealizedPnl) : 0),
      0
    );
    const anyPriceFetched = enrichedPositions.some((p) => p.priceFetched);
    const totalValue = availableBalance + totalPositionValue;

    return NextResponse.json({
      openPositions: enrichedPositions,
      equityHistory: equityHistory.reverse(),
      availableBalance: availableBalance.toFixed(8),
      totalPositionValue: totalPositionValue.toFixed(8),
      totalUnrealizedPnl: anyPriceFetched ? totalUnrealizedPnl.toFixed(8) : null,
      totalValue: totalValue.toFixed(8),
      mode,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 });
  }
}
