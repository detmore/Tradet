import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { botSettings, strategyConfigs } from "@trade/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Defaults mirrored from @trade/config/defaults — cannot import that package
// in Next.js because it runs parseEnv() at module load time
const FLAG_DEFAULTS: Record<string, boolean> = {
  useMfi: true, useCmf: true, usePivot: true, useFractal: true,
  useAlligator: true, useHeikinAshi: true,
  breakoutCloseConfirm: true, retestConfirm: false,
};
const THRESHOLD_DEFAULTS: Record<string, number | null> = {
  scoreThreshold: 60, rsiMin: 55, rsiMax: 70, mfiMin: 50, cmfMin: 0,
  volSmaMultiplier: 1.0, atrMin: 0, atrMax: null, emaCrossoverBars: 5,
};
const RISK_DEFAULTS: Record<string, number> = {
  riskPerTrade: 0.005, maxDailyLoss: 0.02, maxOpenExposure: 0.03,
  consecutiveLossPause: 3, cooldownDurationHours: 4,
};
const EXIT_DEFAULTS: Record<string, number | boolean> = {
  slAtrMult: 1.5, tpAtrMult: 2.5, trailingEnabled: false,
};

export async function GET() {
  try {
    const [settings] = await db.select().from(botSettings).limit(1);
    const [config] = await db.select().from(strategyConfigs)
      .where(eq(strategyConfigs.enabled, true)).limit(1);

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
