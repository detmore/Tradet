import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { botSettings, strategyConfigs } from "@trade/db";
import { FLAG_DEFAULTS, THRESHOLD_DEFAULTS, RISK_DEFAULTS, EXIT_DEFAULTS } from "@trade/config";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [settings] = await db.select().from(botSettings).limit(1);
    const [config] = await db.select().from(strategyConfigs)
      .where(eq(strategyConfigs.enabled, true)).limit(1);

    // Merge with defaults so UI always reflects the complete, correct state
    // (DB may have partial JSONB if config was seeded before defaults were finalized)
    const mergedConfig = config ? {
      ...config,
      flags:      { ...FLAG_DEFAULTS,      ...(config.flags      as object) },
      thresholds: { ...THRESHOLD_DEFAULTS,  ...(config.thresholds as object) },
      risk:       { ...RISK_DEFAULTS,       ...(config.risk       as object) },
      exits:      { ...EXIT_DEFAULTS,       ...(config.exits      as object) },
    } : null;

    return NextResponse.json({ settings: settings ?? null, config: mergedConfig });
  } catch {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}
