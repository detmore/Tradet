"use client";

import { useState, useEffect, useCallback } from "react";
import { useSse } from "@/hooks/use-sse";
import { formatCurrency } from "@/lib/api";
import { MiniEquityChart } from "@/components/charts/mini-equity-chart";
import { useT } from "@/lib/i18n";

interface Position {
  id: string; symbol: string; side: string; qty: string;
  avgEntry: string; sl: string | null; tp: string | null;
  openedAt: string; mode: string;
  currentPrice: string | null;
  unrealizedPnl: string | null;
  positionValue: string;
  priceFetched: boolean;
}
interface EquityPoint { takenAt: string; totalBalance: string }
interface PortfolioData {
  openPositions: Position[];
  equityHistory: EquityPoint[];
  availableBalance: string;
  totalPositionValue: string;
  totalUnrealizedPnl: string | null;
  totalValue: string;
  mode: string;
}

/** P&L dollar amount with adaptive precision */
function formatPnl(value: number): string {
  const abs = Math.abs(value);
  const decimals = abs < 0.01 ? 4 : 2;
  return formatCurrency(abs, decimals);
}

/** P&L as percentage of entry cost */
function pnlPct(pnl: number, entry: number, qty: number): string {
  const cost = entry * qty;
  if (cost === 0) return "";
  return (pnl / cost * 100).toFixed(2) + "%";
}

export function PortfolioContent() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const t = useT();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio");
      setData(await res.json() as PortfolioData);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const id = setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  }, [load]);
  useSse(e => {
    if (e["type"] === "position_opened" || e["type"] === "position_closed" || e["type"] === "trade_event") void load();
  });

  const totalValue = parseFloat(data?.totalValue ?? "0");
  const availableBalance = parseFloat(data?.availableBalance ?? "0");
  const totalPositionValue = parseFloat(data?.totalPositionValue ?? "0");
  const rawPnl = data?.totalUnrealizedPnl;
  const totalUnrealizedPnl = rawPnl !== null && rawPnl !== undefined ? parseFloat(rawPnl) : null;
  const isPaper = data?.mode === "paper";
  const openCount = data?.openPositions.length ?? 0;
  const pnlColor = (totalUnrealizedPnl ?? 0) >= 0 ? "var(--positive)" : "var(--negative)";
  const pnlSign = (totalUnrealizedPnl ?? 0) >= 0 ? "+" : "";

  // Aggregate % across all positions (weighted by cost basis)
  const totalCost = (data?.openPositions ?? []).reduce(
    (s, p) => s + parseFloat(p.avgEntry) * parseFloat(p.qty), 0
  );
  const pnlPctTotal = totalUnrealizedPnl !== null && totalCost > 0
    ? `${pnlSign}${(totalUnrealizedPnl / totalCost * 100).toFixed(2)}%`
    : null;

  const pnlDisplay = totalUnrealizedPnl === null
    ? "—"
    : `${pnlSign}$${formatPnl(totalUnrealizedPnl)}`;

  return (
    <div style={{ padding: "1px", display: "flex", flexDirection: "column", gap: 1, background: "rgba(255,255,255,0.06)" }}>

      {/* ── TOP ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 160px 160px 160px 1fr", gap: 1, background: "rgba(255,255,255,0.06)" }}>

        <StatTile
          label={t("portfolio.total_value")}
          value={`$${formatCurrency(totalValue)}`}
          color="var(--text-1)"
          sub={isPaper ? t("common.paper") : t("common.live")}
          subColor={isPaper ? "var(--accent)" : "var(--negative)"}
          accent
        />
        <StatTile
          label={t("portfolio.available")}
          value={`$${formatCurrency(availableBalance)}`}
          color="var(--text-2)"
        />
        <StatTile
          label={t("portfolio.in_positions")}
          value={`$${formatCurrency(totalPositionValue)}`}
          color={totalPositionValue > 0 ? "var(--accent)" : "var(--text-3)"}
        />
        <StatTile
          label={t("portfolio.unrealized_pnl")}
          value={pnlDisplay}
          color={totalUnrealizedPnl === null ? "var(--text-3)" : openCount > 0 ? pnlColor : "var(--text-3)"}
          sub={pnlPctTotal ?? (openCount > 0 ? `${openCount} ${t("portfolio.active")}` : undefined)}
          subColor={pnlPctTotal ? pnlColor : undefined}
        />

        {/* Equity chart */}
        <div style={{ background: "var(--bg-surface)", padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: "0.14em", color: "var(--text-1)" }}>{t("portfolio.equity_history").toUpperCase()}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)" }}>{data?.equityHistory.length ?? 0} pts</span>
          </div>
          <div className="rule-amber" style={{ marginBottom: 12 }} />
          <MiniEquityChart data={data?.equityHistory ?? []} height={100} />
        </div>
      </div>

      {/* ── POSITIONS TABLE ── */}
      <div style={{ background: "var(--bg-surface)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: "0.14em", color: "var(--text-1)" }}>{t("portfolio.open_positions").toUpperCase()}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)" }}>{openCount} {t("portfolio.active")}</span>
        </div>

        {openCount === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-3)", letterSpacing: "0.08em" }}>
            {t("portfolio.no_positions")}
          </div>
        ) : (
          <table className="bb-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                {[t("table.symbol"), t("table.side"), t("table.qty"), t("table.entry"), t("table.current"), t("table.pnl"), t("table.value"), t("table.sl"), t("table.tp"), t("table.opened")].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data!.openPositions.map(p => {
                const isLong = p.side === "buy";
                const pnl = p.unrealizedPnl !== null ? parseFloat(p.unrealizedPnl) : null;
                const posValue = parseFloat(p.positionValue);
                const currentPx = p.currentPrice !== null ? parseFloat(p.currentPrice) : null;
                const entry = parseFloat(p.avgEntry);
                const qty = parseFloat(p.qty);
                const posPnlColor = (pnl ?? 0) >= 0 ? "var(--positive)" : "var(--negative)";
                const posPnlSign = (pnl ?? 0) >= 0 ? "+" : "";
                const pct = pnl !== null ? pnlPct(pnl, entry, qty) : null;
                return (
                  <tr key={p.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-1)" }}>{p.symbol}</td>
                    <td>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: isLong ? "var(--positive)" : "var(--negative)" }}>
                        {p.side.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-2)" }}>{p.qty}</td>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-1)" }}>${formatCurrency(p.avgEntry)}</td>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-1)" }}>
                      {currentPx !== null ? `$${formatCurrency(currentPx)}` : "—"}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: pnl !== null ? posPnlColor : "var(--text-3)" }}>
                      {pnl !== null
                        ? <>{posPnlSign}${formatPnl(pnl)}<br /><span style={{ fontSize: 10, opacity: 0.7 }}>{posPnlSign}{pct}</span></>
                        : "—"}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-2)" }}>
                      {`$${formatCurrency(posValue)}`}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", color: p.sl ? "var(--negative)" : "var(--text-3)" }}>
                      {p.sl ? `$${formatCurrency(p.sl)}` : "—"}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", color: p.tp ? "var(--positive)" : "var(--text-3)" }}>
                      {p.tp ? `$${formatCurrency(p.tp)}` : "—"}
                    </td>
                    <td style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-3)" }}>
                      {new Date(p.openedAt).toLocaleString("tr-TR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, color, sub, subColor, accent }: {
  label: string; value: string; color: string;
  sub?: string; subColor?: string; accent?: boolean;
}) {
  return (
    <div style={{ background: "var(--bg-surface)", padding: "14px 16px", position: "relative" }}>
      {accent && <>
        <span style={{ position: "absolute", top: 0, left: 0, width: 20, height: 1, background: "var(--accent)" }} />
        <span style={{ position: "absolute", top: 0, left: 0, width: 1, height: 20, background: "var(--accent)" }} />
      </>}
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, lineHeight: 1, color, fontWeight: 600, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: subColor ?? "var(--text-3)" }}>{sub}</div>}
    </div>
  );
}
