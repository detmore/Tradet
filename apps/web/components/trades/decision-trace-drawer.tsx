"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/api";
import { useT } from "@/lib/i18n";

interface LayerResult {
  layer: string; passed: boolean;
  value: number | boolean | string; threshold: number | boolean | string;
  contribution: number; reason?: string;
}
interface TradeDetail {
  trade: {
    id: string; symbol: string; side: string; entryPrice: string;
    exitPrice: string; qty: string; realizedPnl: string;
    openedAt: string; closedAt: string; exitReason: string; decisionScore: string | null;
  };
  strategyRun: {
    decision: string; score: string; trace: LayerResult[];
    mandatoryPassed: boolean; setupPassed: boolean;
    confirmationsPassed: boolean; structurePassed: boolean;
  } | null;
}

export function DecisionTraceDrawer({ tradeId, onClose }: { tradeId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<TradeDetail | null>(null);
  const t = useT();

  useEffect(() => {
    fetch(`/api/trades/${tradeId}`)
      .then(r => r.json())
      .then(d => setDetail(d as TradeDetail))
      .catch(() => {});
  }, [tradeId]);

  const pnl = detail ? parseFloat(detail.trade.realizedPnl) : 0;
  const pnlPos = pnl >= 0;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }} onClick={onClose}>
      {/* backdrop */}
      <div style={{ flex: 1, background: "rgba(0,0,0,0.55)" }} />

      {/* panel */}
      <div
        style={{
          width: 400, background: "var(--bg-surface)", borderLeft: "1px solid rgba(255,255,255,0.08)",
          overflowY: "auto", display: "flex", flexDirection: "column",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-elevated)" }}>
          <div className="rule-amber" style={{ position: "absolute", top: 0, left: 0, right: 0 }} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: "0.14em", color: "var(--text-1)" }}>{t("trades.detail").toUpperCase()}</span>
          <button
            onClick={onClose}
            style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", background: "transparent", border: "1px solid rgba(255,255,255,0.10)", padding: "4px 10px", cursor: "pointer" }}
          >
            Close
          </button>
        </div>

        {!detail ? (
          <div style={{ padding: "24px 16px", fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.10em" }}>{t("trades.loading")}</div>
        ) : (
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Trade summary grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "rgba(255,255,255,0.06)" }}>
              <SummaryCell label={t("table.symbol")} value={detail.trade.symbol} valueColor="var(--text-1)" mono />
              <SummaryCell
                label={t("table.pnl")}
                value={`${pnlPos ? "+" : "−"}$${Math.abs(pnl).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                valueColor={pnlPos ? "var(--positive)" : "var(--negative)"}
                mono
              />
              <SummaryCell label={t("table.entry")} value={`$${formatCurrency(detail.trade.entryPrice)}`} mono />
              <SummaryCell label={`${t("table.exit")} (${detail.trade.exitReason})`} value={`$${formatCurrency(detail.trade.exitPrice)}`} mono />
              <SummaryCell label={t("table.qty")} value={detail.trade.qty} mono />
              <SummaryCell label={t("table.side")} value={detail.trade.side.toUpperCase()} valueColor={detail.trade.side === "buy" ? "var(--positive)" : "var(--negative)"} />
              <SummaryCell
                label={t("table.opened")}
                value={new Date(detail.trade.openedAt).toLocaleString("tr-TR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              />
              <SummaryCell
                label={t("table.closed")}
                value={new Date(detail.trade.closedAt).toLocaleString("tr-TR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              />
            </div>

            {/* Signal trace */}
            {detail.strategyRun ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: "0.14em", color: "var(--text-1)" }}>{t("trades.signal_trace").toUpperCase()}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)" }}>{t("trades.score_label")}</span>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--accent)", lineHeight: 1 }}>
                      {parseFloat(detail.strategyRun.score).toFixed(0)}
                    </span>
                  </div>
                </div>
                <div className="rule-amber" style={{ marginBottom: 10 }} />

                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {detail.strategyRun.trace.map((layer, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 10px",
                        background: layer.passed ? "rgba(0,230,118,0.05)" : "rgba(255,255,255,0.02)",
                        borderLeft: `2px solid ${layer.passed ? "var(--positive)" : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: layer.passed ? "var(--positive)" : "var(--text-3)", flexShrink: 0 }}>
                        {layer.passed ? "●" : "○"}
                      </span>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: layer.passed ? "var(--text-2)" : "var(--text-3)", flex: 1, letterSpacing: "0.04em" }}>
                        {layer.layer.replace(/_/g, " ")}
                      </span>
                      {layer.contribution > 0 && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--positive)", flexShrink: 0 }}>
                          +{layer.contribution}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Layer summary badges */}
                <div style={{ display: "flex", gap: 4, marginTop: 12, flexWrap: "wrap" }}>
                  {[
                    { label: t("trades.mandatory"), ok: detail.strategyRun.mandatoryPassed },
                    { label: t("trades.setup"), ok: detail.strategyRun.setupPassed },
                    { label: t("trades.confirm"), ok: detail.strategyRun.confirmationsPassed },
                    { label: t("trades.struct"), ok: detail.strategyRun.structurePassed },
                  ].map(({ label, ok }) => (
                    <span
                      key={label}
                      style={{
                        fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase",
                        padding: "3px 8px",
                        background: ok ? "rgba(0,230,118,0.10)" : "rgba(255,255,255,0.04)",
                        color: ok ? "var(--positive)" : "var(--text-3)",
                        border: `1px solid ${ok ? "rgba(0,230,118,0.20)" : "rgba(255,255,255,0.06)"}`,
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.06em" }}>
                {t("trades.no_trace")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCell({ label, value, valueColor, mono }: {
  label: string; value: string; valueColor?: string; mono?: boolean;
}) {
  return (
    <div style={{ background: "var(--bg-surface)", padding: "8px 12px" }}>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: mono ? "var(--font-mono)" : "var(--font-ui)", fontSize: 12, color: valueColor ?? "var(--text-2)", fontWeight: 600 }}>{value}</div>
    </div>
  );
}
