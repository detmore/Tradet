import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trades, strategyRuns, positions } from "@trade/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [trade] = await db.select().from(trades).where(eq(trades.id, id));
    if (!trade) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [position] = await db.select().from(positions).where(eq(positions.id, trade.positionId));
    const strategyRun =
      position?.strategyRunId
        ? (await db.select().from(strategyRuns).where(eq(strategyRuns.id, position.strategyRunId)))[0] ?? null
        : null;

    return NextResponse.json({
      trade,
      position: position ?? null,
      strategyRun: strategyRun ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch trade" }, { status: 500 });
  }
}
