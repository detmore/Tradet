"use client";

import { useState, useEffect, useCallback } from "react";
import { MiniEquityChart } from "@/components/charts/mini-equity-chart";
import { useT } from "@/lib/i18n";

type EquityPoint = { takenAt: string; totalBalance: string };
type AlertItem = { id: string; severity: string; category: string; title: string; sentAt: string };

interface OverviewData {
  settings: {
    mode: string;
    paperCurrentBalance: string;
    paperStartingBalance: string;
    accountCurrency: string;
    isRunning: boolean;
    killSwitchActive: boolean;
  } | null;
  latestEquity: { unrealizedPnl: string; totalBalance: string } | null;
  firstEquityBalance: string | null;
  liveUnrealizedPnl: string | null;
  todayPnl: string;
  openPositionCount: number;
  recentAlerts: AlertItem[];
  equityHistory: EquityPoint[];
}

const fmt = (n: number, d = 2) =>
  Math.abs(n).toLocaleString("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d });
const sign = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "");
const pnlColor = (n: number) =>
  n > 0 ? "var(--positive)" : n < 0 ? "var(--negative)" : "var(--text-2)";

export function OverviewContent() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const t = useT();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/overview");
      if (res.ok) {
        setData(await res.json() as OverviewData);
        setLastRefresh(new Date());
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.14em", color: "var(--text-3)", textTransform: "uppercase" }}>
      {t("common.loading")}
    </div>
  );

  const s = data?.settings;
  const balance    = parseFloat(s?.paperCurrentBalance ?? "0");
  const startBal   = parseFloat(s?.paperStartingBalance ?? "0");
  const todayPnl   = parseFloat(data?.todayPnl ?? "0");
  // Use live unrealized PnL (from Binance prices) if available, fall back to DB snapshot
  const unrealized = data?.liveUnrealizedPnl !== null && data?.liveUnrealizedPnl !== undefined
    ? parseFloat(data.liveUnrealizedPnl)
    : parseFloat(data?.latestEquity?.unrealizedPnl ?? "0");
  const openPos    = data?.openPositionCount ?? 0;
  const isPaper    = s?.mode === "paper";
  const isRunning  = s?.isRunning ?? false;
  const killActive = s?.killSwitchActive ?? false;
  // All-time return: use first equity snapshot as baseline (not configured starting balance)
  const refBal = data?.firstEquityBalance !== null && data?.firstEquityBalance !== undefined
    ? parseFloat(data.firstEquityBalance)
    : startBal;
  const totalReturn = refBal > 0 ? ((balance - refBal) / refBal) * 100 : 0;

  return (
    <div style={{ height: "100%", overflow: "auto", background: "var(--bg)", padding: 1 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>

        {/* ── KPI ROW ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, background: "rgba(255,255,255,0.06)" }}>
          <KpiTile
            label={t("overview.portfolio_value")}
            value={`$${fmt(balance)}`}
            color="var(--text-1)"
            sub={`${sign(totalReturn)}${Math.abs(totalReturn).toFixed(2)}% ${t("overview.all_time")}`}
            subColor={pnlColor(totalReturn)}
          />
          <KpiTile
            label={t("overview.today_pnl")}
            value={`${sign(todayPnl)}$${fmt(Math.abs(todayPnl))}`}
            color={pnlColor(todayPnl)}
            sub={t("overview.realized_today")}
          />
          <KpiTile
            label={t("overview.unrealized")}
            value={`${sign(unrealized)}$${fmt(Math.abs(unrealized))}`}
            color={pnlColor(unrealized)}
            sub={t("overview.open_pos")}
          />
          <KpiTile
            label={t("overview.open_positions")}
            value={String(openPos)}
            color={openPos > 0 ? "var(--accent)" : "var(--text-2)"}
            sub={openPos === 0 ? t("overview.no_exposure") : t("overview.active_trades")}
            large
          />
          <KpiTile
            label={t("overview.mode")}
            value={isPaper ? t("common.paper") : t("common.live")}
            color={isPaper ? "var(--accent)" : "var(--negative)"}
            sub={isRunning ? t("overview.engine_running") : t("overview.engine_stopped")}
            subColor={isRunning ? "var(--positive)" : "var(--text-3)"}
          />
        </div>

        {/* ── MIDDLE ROW ── */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 1, background: "rgba(255,255,255,0.06)" }}>

          {/* Equity curve panel */}
          <div style={{ background: "var(--bg-surface)", padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: "0.14em", color: "var(--text-1)" }}>
                  {t("overview.equity_curve").toUpperCase()}
                </span>
                {data && data.equityHistory.length > 1 && (() => {
                  const first = parseFloat(data.equityHistory[0]?.totalBalance ?? "0");
                  const last  = parseFloat(data.equityHistory[data.equityHistory.length - 1]?.totalBalance ?? "0");
                  const chg   = last - first;
                  return (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: pnlColor(chg) }}>
                      {sign(chg)}${fmt(Math.abs(chg))}
                    </span>
                  );
                })()}
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)" }}>
                {data?.equityHistory.length ?? 0} {t("overview.pts")}
              </span>
            </div>
            <div className="rule-amber" style={{ marginBottom: 14 }} />
            <MiniEquityChart data={data?.equityHistory ?? []} height={160} />
          </div>

          {/* System status panel */}
          <div style={{ background: "var(--bg-surface)", padding: "18px 20px" }}>
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: "0.14em", color: "var(--text-1)" }}>
                {t("overview.system").toUpperCase()}
              </span>
              <div className="rule-amber" style={{ marginTop: 8 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <StatusRow
                label={t("overview.engine")}
                active={isRunning}
                activeLabel={t("overview.running").toUpperCase()}
                inactiveLabel={t("overview.stopped").toUpperCase()}
                activeColor="var(--positive)"
                pulse={isRunning}
              />
              <StatusRow
                label={t("overview.kill_switch")}
                active={killActive}
                activeLabel={t("overview.active").toUpperCase()}
                inactiveLabel={t("overview.off").toUpperCase()}
                activeColor="var(--negative)"
              />
            </div>

            <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "12px 0" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <InfoRow label={t("overview.mode")}     value={s?.mode?.toUpperCase() ?? "—"} valueColor={isPaper ? "var(--accent)" : "var(--negative)"} />
              <InfoRow label={t("overview.currency")} value={s?.accountCurrency ?? "—"} />
              <InfoRow label={t("overview.starting")} value={`$${fmt(startBal)}`} />
              {lastRefresh && (
                <InfoRow
                  label={t("overview.updated")}
                  value={lastRefresh.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                />
              )}
            </div>

            <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "12px 0" }} />

            {/* Balance bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)" }}>{t("overview.balance_change")}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: pnlColor(totalReturn) }}>
                  {sign(totalReturn)}{Math.abs(totalReturn).toFixed(2)}%
                </span>
              </div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.07)", position: "relative" }}>
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0,
                  width: `${Math.min(Math.max((balance / Math.max(startBal, balance)) * 100, 0), 100)}%`,
                  background: totalReturn >= 0 ? "var(--positive)" : "var(--negative)",
                  transition: "width 0.3s ease",
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── EVENTS ROW ── */}
        <div style={{ background: "var(--bg-surface)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: "0.14em", color: "var(--text-1)" }}>
              {t("overview.recent_events").toUpperCase()}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)" }}>
              {data?.recentAlerts.length ?? 0} {t("overview.entries")}
            </span>
          </div>

          {!data?.recentAlerts.length ? (
            <div style={{ padding: "28px 16px", fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-3)", letterSpacing: "0.08em", textAlign: "center" }}>
              {t("overview.no_events")}
            </div>
          ) : (
            <table className="bb-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>{t("table.severity")}</th>
                  <th>{t("table.category")}</th>
                  <th>{t("table.event")}</th>
                  <th style={{ textAlign: "right" }}>{t("table.time")}</th>
                </tr>
              </thead>
              <tbody>
                {data.recentAlerts.slice(0, 8).map(a => (
                  <tr key={a.id}>
                    <td><SeverityBadge s={a.severity} /></td>
                    <td style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {a.category}
                    </td>
                    <td style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-2)" }}>
                      {a.title}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", textAlign: "right" }}>
                      {new Date(a.sentAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function KpiTile({ label, value, color, sub, subColor, large }: {
  label: string; value: string; color: string;
  sub?: string; subColor?: string; large?: boolean;
}) {
  return (
    <div style={{ background: "var(--bg-surface)", padding: "14px 16px", position: "relative" }}>
      {/* amber corner */}
      <span style={{ position: "absolute", top: 0, left: 0, width: 20, height: 1, background: "var(--accent)" }} />
      <span style={{ position: "absolute", top: 0, left: 0, width: 1, height: 20, background: "var(--accent)" }} />

      <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 6, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{
        fontFamily: large ? "var(--font-display)" : "var(--font-mono)",
        fontSize: large ? 36 : 22,
        lineHeight: 1,
        color,
        fontWeight: large ? undefined : 600,
        letterSpacing: large ? "0.04em" : "0.02em",
        marginBottom: 4,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: subColor ?? "var(--text-3)", marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function StatusRow({ label, active, activeLabel, inactiveLabel, activeColor, pulse }: {
  label: string; active: boolean;
  activeLabel: string; inactiveLabel: string;
  activeColor: string; pulse?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.06em" }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span
          className={active && pulse ? "pulse-dot" : undefined}
          style={{
            display: "inline-block", width: 6, height: 6, borderRadius: "50%",
            background: active ? activeColor : "rgba(255,255,255,0.12)",
            boxShadow: active ? `0 0 5px ${activeColor}` : "none",
          }}
        />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.08em", fontWeight: 600, color: active ? activeColor : "var(--text-3)" }}>
          {active ? activeLabel : inactiveLabel}
        </span>
      </div>
    </div>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.06em" }}>
        {label}
      </span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: valueColor ?? "var(--text-2)", letterSpacing: "0.04em" }}>
        {value}
      </span>
    </div>
  );
}

function SeverityBadge({ s }: { s: string }) {
  const color = s === "critical" ? "var(--negative)"
    : s === "error" ? "var(--negative)"
    : s === "warning" ? "var(--accent)"
    : "var(--text-3)";
  return (
    <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color }}>
      {s.toUpperCase()}
    </span>
  );
}
