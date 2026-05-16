import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { strategyConfigs } from "@trade/db";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as {
      id: string;
      timeframe?: string;
      symbols?: string[];
      thresholds?: Record<string, unknown>;
      flags?: Record<string, unknown>;
      risk?: Record<string, unknown>;
      exits?: Record<string, unknown>;
    };

    if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (body.timeframe !== undefined) updates["timeframe"] = body.timeframe;
    if (body.symbols !== undefined) updates["symbols"] = body.symbols;
    if (body.thresholds !== undefined) updates["thresholds"] = body.thresholds;
    if (body.flags !== undefined) updates["flags"] = body.flags;
    if (body.risk !== undefined) updates["risk"] = body.risk;
    if (body.exits !== undefined) updates["exits"] = body.exits;

    await db.update(strategyConfigs).set(updates).where(eq(strategyConfigs.id, body.id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
