import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { positions, equitySnapshots, botSettings } from "@trade/db";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

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

    return NextResponse.json({
      openPositions,
      equityHistory: equityHistory.reverse(),
      currentBalance: settings?.paperCurrentBalance ?? "0",
      mode,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 });
  }
}
