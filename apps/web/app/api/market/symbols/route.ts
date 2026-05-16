import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { strategyRuns, strategyConfigs, botSettings, positions } from "@trade/db";
import { desc, eq, and, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

type LayerResult = { layer: string; passed: boolean };

function layerPassed(trace: LayerResult[], name: string): boolean {
  return trace.find((l) => l.layer === name)?.passed ?? false;
}

export async function GET() {
  try {
    const [settings] = await db.select({ mode: botSettings.mode }).from(botSettings).limit(1);
    const mode = settings?.mode ?? "paper";

    const [config] = await db.select({ symbols: strategyConfigs.symbols })
      .from(strategyConfigs)
      .where(eq(strategyConfigs.enabled, true))
      .limit(1);

    const symbols = (config?.symbols as string[]) ?? ["BTC/USDT"];

    const runPromises = symbols.map((sym) =>
      db.select({
        symbol: strategyRuns.symbol,
        decision: strategyRuns.decision,
        score: strategyRuns.score,
        mandatoryPassed: strategyRuns.mandatoryPassed,
        setupPassed: strategyRuns.setupPassed,
        confirmationsPassed: strategyRuns.confirmationsPassed,
        trace: strategyRuns.trace,
        evaluatedAt: strategyRuns.evaluatedAt,
      })
        .from(strategyRuns)
        .where(eq(strategyRuns.symbol, sym))
        .orderBy(desc(strategyRuns.evaluatedAt))
        .limit(1)
    );

    const openPosPromise = symbols.length > 0
      ? db.select({ symbol: positions.symbol })
          .from(positions)
          .where(and(inArray(positions.symbol, symbols), eq(positions.status, "open"), eq(positions.mode, mode)))
      : Promise.resolve([]);

    const [allRuns, openPos] = await Promise.all([
      Promise.all(runPromises),
      openPosPromise,
    ]);

    const openSymbols = new Set(openPos.map((p) => p.symbol));

    const result = symbols.map((sym, i) => {
      const run = allRuns[i]?.[0];
      const trace = (run?.trace ?? []) as LayerResult[];
      return {
        symbol: sym,
        decision: run?.decision ?? "—",
        score: run ? parseFloat(run.score) : 0,
        mandatoryPassed: run?.mandatoryPassed ?? false,
        setupPassed: run?.setupPassed ?? false,
        confirmationsPassed: run?.confirmationsPassed ?? false,
        evaluatedAt: run?.evaluatedAt ?? null,
        hasOpenPosition: openSymbols.has(sym),
        // Bireysel layer durumları — 4 nokta için
        layers: {
          ema200:  layerPassed(trace, "ema200_filter"),
          atr:     layerPassed(trace, "atr_range_filter"),
          volume:  layerPassed(trace, "volume_filter"),
          ema2050: layerPassed(trace, "ema2050_setup"),
        },
      };
    });

    return NextResponse.json({ symbols: result, mode });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
