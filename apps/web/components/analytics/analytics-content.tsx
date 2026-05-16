"use client";

import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n";

interface AnalyticsStats {
  totalTrades: number; winRate: string; avgWin: string;
  avgLoss: string; expectancy: string; maxDrawdown: string; totalPnl: string;
}
interface AnalyticsData { stats: AnalyticsStats | null; dailyPnl: Record<string, number> }

export function AnalyticsContent() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const t = useT();

  useEffect(() => {
    fetch("/api/analytics").then(r => r.json()).then(d => setData(d as AnalyticsData)).catch(() => {});
  }, []);

  if (!data?.stats) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-3)", letterSpacing: "0.10em", textTransform: "uppercase" }}>
        {t("analytics.no_trades")}
      </div>
    );
  }

  const stats = data.stats;
  const totalPnl = parseFloat(stats.totalPnl);
  const expectancy = parseFloat(stats.expectancy);
  const winRate = parseFloat(stats.winRate);

  const dailyEntries = Object.entries(data.dailyPnl ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-49);

  return (
    <div style={{ padding: "1px", display: "flex", flexDirection: "column", gap: 1, background: "rgba(255,255,255,0.06)" }}>

      {/* ── PRIMARY KPI ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "rgba(255,255,255,0.06)" }}>
        <KpiTile label={t("analytics.total_trades")} value={String(stats.totalTrades)} color="var(--text-1)" />
        <KpiTile
          label={t("analytics.win_rate")}
          value={`${winRate.toFixed(1)}%`}
          color={winRate >= 50 ? "var(--positive)" : "var(--negative)"}
        />
        <KpiTile
          label={t("analytics.total_pnl")}
          value={`${totalPnl >= 0 ? "+" : "−"}$${Math.abs(totalPnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          color={totalPnl >= 0 ? "var(--positive)" : "var(--negative)"}
        />
        <KpiTile label={t("analytics.max_drawdown")} value={`-$${parseFloat(stats.maxDrawdown).toLocaleString("en-US", { minimumFractionDigits: 2 })}`} color="var(--negative)" />
      </div>

      {/* ── SECONDARY KPI ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "rgba(255,255,255,0.06)" }}>
        <KpiTile label={t("analytics.avg_win")} value={`+$${parseFloat(stats.avgWin).toFixed(2)}`} color="var(--positive)" sub={t("analytics.per_winning")} />
        <KpiTile label={t("analytics.avg_loss")} value={`-$${parseFloat(stats.avgLoss).toFixed(2)}`} color="var(--negative)" sub={t("analytics.per_losing")} />
        <KpiTile
          label={t("analytics.expectancy")}
          value={`${expectancy >= 0 ? "+" : "−"}$${Math.abs(expectancy).toFixed(2)}`}
          color={expectancy >= 0 ? "var(--positive)" : "var(--negative)"}
          sub={t("analytics.per_trade")}
        />
      </div>

      {/* ── DAILY PNL HEATMAP ── */}
      <div style={{ background: "var(--bg-surface)", padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: "0.14em", color: "var(--text-1)" }}>{t("analytics.daily_pnl").toUpperCase()}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)" }}>{dailyEntries.length} {t("analytics.last_days")}</span>
        </div>
        <div className="rule-amber" style={{ marginBottom: 14 }} />

        {dailyEntries.length === 0 ? (
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-3)", padding: "16px 0" }}>{t("analytics.no_daily")}</div>
        ) : (
          <>
            {/* Day-of-week headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
              {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(d => (
                <div key={d} style={{ fontFamily: "var(--font-ui)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.08em", textAlign: "center", paddingBottom: 2 }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {dailyEntries.map(([day, pnl]) => {
                const pos = pnl > 0;
                const neg = pnl < 0;
                return (
                  <div
                    key={day}
                    title={`${day}: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
                    style={{
                      height: 40,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: pos ? "rgba(0,230,118,0.10)" : neg ? "rgba(255,59,59,0.10)" : "var(--bg-elevated)",
                      border: `1px solid ${pos ? "rgba(0,230,118,0.15)" : neg ? "rgba(255,59,59,0.15)" : "rgba(255,255,255,0.04)"}`,
                      cursor: "default",
                    }}
                  >
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: 10,
                      color: pos ? "var(--positive)" : neg ? "var(--negative)" : "var(--text-3)",
                      fontWeight: 600,
                    }}>
                      {pnl !== 0 ? `${pnl > 0 ? "+" : ""}${pnl.toFixed(0)}` : "—"}
                    </span>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 8, color: "var(--text-3)", marginTop: 1 }}>
                      {new Date(day).getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

    </div>
  );
}

function KpiTile({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ background: "var(--bg-surface)", padding: "14px 16px", position: "relative" }}>
      <span style={{ position: "absolute", top: 0, left: 0, width: 20, height: 1, background: "var(--accent)" }} />
      <span style={{ position: "absolute", top: 0, left: 0, width: 1, height: 20, background: "var(--accent)" }} />
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, lineHeight: 1, color, fontWeight: 600, marginBottom: sub ? 4 : 0 }}>{value}</div>
      {sub && <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-3)" }}>{sub}</div>}
    </div>
  );
}
