import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { strategyRuns, strategyConfigs, botSettings, positions } from "@trade/db";
import { desc, eq, and, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [settings] = await db.select({ mode: botSettings.mode }).from(botSettings).limit(1);
    const mode = settings?.mode ?? "paper";

    const [config] = await db.select({ symbols: strategyConfigs.symbols })
      .from(strategyConfigs)
      .where(eq(strategyConfigs.enabled, true))
      .limit(1);

    const symbols = (config?.symbols as string[]) ?? ["BTC/USDT"];

    // Her sembol için son evaluation'ı al (paralel sorgular)
    const runPromises = symbols.map((sym) =>
      db.select({
        symbol: strategyRuns.symbol,
        decision: strategyRuns.decision,
        score: strategyRuns.score,
        mandatoryPassed: strategyRuns.mandatoryPassed,
        setupPassed: strategyRuns.setupPassed,
        confirmationsPassed: strategyRuns.confirmationsPassed,
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
      return {
        symbol: sym,
        decision: run?.decision ?? "—",
        score: run ? parseFloat(run.score) : 0,
        mandatoryPassed: run?.mandatoryPassed ?? false,
        setupPassed: run?.setupPassed ?? false,
        confirmationsPassed: run?.confirmationsPassed ?? false,
        evaluatedAt: run?.evaluatedAt ?? null,
        hasOpenPosition: openSymbols.has(sym),
      };
    });

    return NextResponse.json({ symbols: result, mode });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
