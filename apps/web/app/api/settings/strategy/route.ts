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

    if (!body.id || typeof body.id !== "string" || !/^[0-9a-f-]{36}$/.test(body.id)) {
      return NextResponse.json({ error: "Invalid or missing id" }, { status: 400 });
    }

    // Validate risk fields if present
    if (body.risk) {
      const r = body.risk as Record<string, unknown>;
      if ("riskPerTrade" in r && (typeof r["riskPerTrade"] !== "number" || (r["riskPerTrade"] as number) <= 0 || (r["riskPerTrade"] as number) > 0.5)) {
        return NextResponse.json({ error: "riskPerTrade must be a fraction between 0 and 0.5 (e.g. 0.005 for 0.5%)" }, { status: 400 });
      }
      if ("maxDailyLoss" in r && (typeof r["maxDailyLoss"] !== "number" || (r["maxDailyLoss"] as number) <= 0 || (r["maxDailyLoss"] as number) > 1)) {
        return NextResponse.json({ error: "maxDailyLoss must be a fraction between 0 and 1" }, { status: 400 });
      }
      if ("maxOpenExposure" in r && (typeof r["maxOpenExposure"] !== "number" || (r["maxOpenExposure"] as number) <= 0 || (r["maxOpenExposure"] as number) > 1)) {
        return NextResponse.json({ error: "maxOpenExposure must be a fraction between 0 and 1" }, { status: 400 });
      }
    }

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
