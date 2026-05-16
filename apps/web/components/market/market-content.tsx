"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PriceChart } from "@/components/charts/price-chart";
import type { CandlestickData, HistogramData, Time } from "lightweight-charts";
import { useT } from "@/lib/i18n";
import { useSse } from "@/hooks/use-sse";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface LayerResult {
  layer: string;
  passed: boolean;
  value: number | boolean | string;
  threshold: number | boolean | string;
  contribution: number;
}

interface MarketApiData {
  latestRun: {
    decision: string;
    score: string;
    trace: LayerResult[];
    mandatoryPassed: boolean;
    setupPassed: boolean;
  } | null;
  openPosition: { avgEntry: string; sl: string | null; tp: string | null } | null;
}

const SYMBOLS_FALLBACK = ["BTC/USDT"];
const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"];

// Binance max per request = 1000.
const TF_LIMIT: Record<string, number> = {
  "1m":  1000,
  "5m":  1000,
  "15m": 1000,
  "1h":  1000,
  "4h":  1000,
  "1d":  1000,
};

// How many candles to show in the initial visible window:
// 1m → 4 hours | 5m / 15m → 1 day | 1h → 1 week | 4h / 1d → 3 months
const TF_VISIBLE: Record<string, number> = {
  "1m":  240,  // 4 hours
  "5m":  288,  // 1 day
  "15m":  96,  // 1 day
  "1h":  168,  // 1 week
  "4h":  540,  // 3 months
  "1d":   90,  // 3 months
};
const BORDER     = "rgba(255,255,255,0.07)";

function fmt(n: number | string, dec = 2) {
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(v)) return "—";
  return v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function pct(n: number, withSign = true) {
  return (withSign && n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

function layerLabel(raw: string) {
  return raw.replace(/_filter|_confirmation|_structure|_setup/g, "").replace(/_/g, " ").trim();
}

function fmtLayerVal(v: number | boolean | string): string {
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "string") return v;
  if (!isFinite(v)) return "∞";
  // Large price-like numbers → 2 decimals, small ratios → 4
  return Math.abs(v) >= 1 ? v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v.toFixed(4);
}

interface SymbolOverview {
  symbol: string;
  decision: string;
  score: number;
  mandatoryPassed: boolean;
  setupPassed: boolean;
  confirmationsPassed: boolean;
  hasOpenPosition: boolean;
  layers: { ema200: boolean; atr: boolean; volume: boolean; ema2050: boolean };
}

export function MarketContent() {
  const t = useT();
  const [symbol,       setSymbol]       = useState("BTC/USDT");
  const [timeframe,    setTimeframe]    = useState("15m");
  const [candles,      setCandles]      = useState<Candle[]>([]);
  const [marketData,   setMarketData]   = useState<MarketApiData | null>(null);
  const [symbolsData,  setSymbolsData]  = useState<SymbolOverview[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [chartH,       setChartH]       = useState(400);
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  // Dynamic chart height
  useEffect(() => {
    const el = chartAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setChartH(el.clientHeight || 400));
    ro.observe(el);
    setChartH(el.clientHeight || 400);
    return () => ro.disconnect();
  }, []);

  const fetchCandles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const limit = TF_LIMIT[timeframe] ?? 1000;
      const res   = await fetch(`/api/market/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&limit=${limit}`);
      const json = await res.json() as { candles: Candle[]; error?: string };
      if (json.error) throw new Error(json.error);
      setCandles(json.candles);
    } catch (e) { setError(String(e)); }
    finally     { setLoading(false); }
  }, [symbol, timeframe]);

  const fetchMarket = useCallback(async () => {
    try {
      const res = await fetch(`/api/market?symbol=${encodeURIComponent(symbol)}`);
      setMarketData(await res.json() as MarketApiData);
    } catch { /* silent */ }
  }, [symbol]);

  const fetchSymbols = useCallback(async () => {
    try {
      const res = await fetch("/api/market/symbols");
      const json = await res.json() as { symbols: SymbolOverview[] };
      if (json.symbols?.length) {
        setSymbolsData(json.symbols);
        // İlk yüklemede aktif sembollerden ilkini seç
        setSymbol(prev => {
          const syms = json.symbols.map(s => s.symbol);
          return syms.includes(prev) ? prev : (syms[0] ?? prev);
        });
      }
    } catch { /* silent */ }
  }, []);

  // SSE: bot her tick'te strategy_evaluated gönderiyor — anında refresh
  useSse(useCallback((event) => {
    if (event["type"] === "trade_event") {
      void fetchMarket();
      void fetchSymbols();
    }
  }, [fetchMarket, fetchSymbols]));

  useEffect(() => {
    void fetchSymbols();
    void fetchCandles();
    void fetchMarket();
    // Fallback polling: SSE çalışmıyorsa veya chart verisi için
    timerRef.current = setInterval(() => {
      void fetchSymbols();
      void fetchMarket();
    }, 30_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchSymbols, fetchCandles, fetchMarket]);

  // Derived
  const last   = candles.at(-1);
  const prev   = candles.at(-2);
  const change = last && prev ? ((last.close - prev.close) / prev.close) * 100 : 0;
  const isUp   = change >= 0;
  const recent = candles.slice(-96);
  const high24 = recent.reduce((m, c) => Math.max(m, c.high), 0);
  const low24  = recent.reduce((m, c) => Math.min(m, c.low === 0 ? Infinity : c.low), Infinity);
  const vol24  = recent.reduce((s, c) => s + c.volume, 0);

  const chartCandles: CandlestickData<Time>[] = candles.map(c => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close }));
  const chartVolume:  HistogramData<Time>[]   = candles.map(c => ({ time: c.time as Time, value: c.volume }));

  const levels: { price: number; color: string; title: string; lineStyle: 0 | 1 | 2 }[] = [];
  if (marketData?.openPosition) {
    const p = marketData.openPosition;
    levels.push({ price: parseFloat(p.avgEntry), color: "#f0a500", title: "ENTRY", lineStyle: 0 });
    if (p.sl) levels.push({ price: parseFloat(p.sl), color: "#ff3b3b", title: "SL",    lineStyle: 2 });
    if (p.tp) levels.push({ price: parseFloat(p.tp), color: "#00e676", title: "TP",    lineStyle: 2 });
  }

  const run   = marketData?.latestRun;
  const score = run ? parseFloat(run.score) : 0;
  const pos   = marketData?.openPosition;

  const priceDecimals = last && last.close > 1000 ? 2 : 4;

  return (
    <div style={{ height: "calc(100vh - 48px)", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}>

      {/* ── Control bar ── */}
      <div style={{ display: "flex", alignItems: "stretch", height: 40, borderBottom: `1px solid ${BORDER}`, flexShrink: 0, background: "var(--bg-elevated)" }}>

        {/* Symbols — aktif semboller sinyal durumu ile */}
        <div style={{ display: "flex", alignItems: "center", gap: 1, padding: "0 6px", borderRight: `1px solid ${BORDER}` }}>
          {(symbolsData.length
            ? symbolsData
            : SYMBOLS_FALLBACK.map(s => ({ symbol: s, decision: "—", score: 0, mandatoryPassed: false, setupPassed: false, confirmationsPassed: false, hasOpenPosition: false, layers: { ema200: false, atr: false, volume: false, ema2050: false } }))
          ).map(sd => {
            const on = symbol === sd.symbol;
            const isBuy = sd.decision === "buy";
            const LAYER_DOTS = [
              { key: "ema200",  label: "E200" },
              { key: "atr",     label: "ATR"  },
              { key: "volume",  label: "VOL"  },
              { key: "ema2050", label: "EMA"  },
            ] as const;
            return (
              <button key={sd.symbol} onClick={() => setSymbol(sd.symbol)} style={{
                display: "flex", flexDirection: "column", alignItems: "flex-start",
                padding: "5px 14px 5px 10px", cursor: "pointer", gap: 4, minWidth: 90,
                borderRight: `1px solid ${BORDER}`,
                borderBottom: on ? "2px solid var(--accent)" : "2px solid transparent",
                background: on ? "var(--accent-dim)" : "transparent",
                transition: "background 0.1s",
              }}>
                {/* Sembol adı + skor */}
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", width: "100%", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
                    color: on ? "var(--accent)" : "var(--text-1)", fontWeight: 700 }}>
                    {sd.symbol.replace("/USDT", "")}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
                    color: isBuy ? "var(--positive)" : sd.score >= 60 ? "var(--warning)" : "var(--text-3)" }}>
                    {sd.score > 0 ? Math.round(sd.score) : "—"}
                  </span>
                </div>
                {/* 4 layer noktası: EMA200 · ATR · VOL · EMA2050 */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {LAYER_DOTS.map(({ key, label }) => {
                    const passed = sd.layers[key];
                    return (
                      <div key={key} title={label} style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: passed ? "var(--positive)" : "rgba(255,255,255,0.12)",
                        boxShadow: passed ? "0 0 4px var(--positive)" : "none",
                        flexShrink: 0,
                      }} />
                    );
                  })}
                  {sd.hasOpenPosition && (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--accent)", marginLeft: 2, letterSpacing: "0.04em" }}>POS</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Timeframes */}
        <div style={{ display: "flex", alignItems: "center", gap: 1, padding: "0 8px", borderRight: `1px solid ${BORDER}` }}>
          {TIMEFRAMES.map(tf => {
            const on = timeframe === tf;
            return (
              <button key={tf} onClick={() => setTimeframe(tf)} style={{
                fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase",
                padding: "3px 8px", cursor: "pointer", border: "none",
                background: on ? "var(--accent-dim)" : "transparent", color: on ? "var(--accent)" : "var(--text-3)",
                fontWeight: on ? 700 : 400, transition: "all 0.1s",
                borderBottom: on ? "2px solid var(--accent)" : "2px solid transparent",
              }}>{tf}</button>
            );
          })}
        </div>

        {/* Price */}
        {last && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 14px", borderRight: `1px solid ${BORDER}` }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 22, lineHeight: 1, color: isUp ? "var(--positive)" : "var(--negative)" }}>
              {fmt(last.close, priceDecimals)}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: isUp ? "var(--positive)" : "var(--negative)", fontWeight: 600 }}>
              {pct(change)}
            </span>
          </div>
        )}

        {/* OHLV stats */}
        {last && ([
          { k: "H",            v: fmt(high24, priceDecimals),                       accent: false },
          { k: "L",            v: fmt(low24 === Infinity ? 0 : low24, priceDecimals), accent: false },
          { k: t("market.vol"), v: (vol24 / 1e6).toFixed(2) + "M",                  accent: true  },
        ] as const).map(({ k, v, accent }) => (
          <div key={k} style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 12px", gap: 1, borderRight: `1px solid ${BORDER}` }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-3)", fontWeight: 600 }}>{k}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: accent ? "var(--accent)" : "var(--text-2)", fontWeight: 600 }}>{v}</span>
          </div>
        ))}

        <div style={{ flex: 1 }} />

        {/* Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px", borderLeft: `1px solid ${BORDER}` }}>
          {loading
            ? <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: "0.12em", color: "var(--text-3)" }}>LOADING…</span>
            : error
            ? <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: "0.12em", color: "var(--negative)" }}>CONN ERR</span>
            : <>
                <span className="pulse-dot" style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "var(--positive)" }} />
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: "0.12em", color: "var(--positive)", fontWeight: 700 }}>LIVE</span>
              </>
          }
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* Chart area */}
        <div ref={chartAreaRef} style={{ flex: 1, overflow: "hidden", minWidth: 0, position: "relative" }}>
          {candles.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 8 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--text-3)" }}>
                {loading ? "LOADING" : error ? "ERROR" : "NO DATA"}
              </span>
              {error && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", maxWidth: 300, textAlign: "center" }}>{error}</span>}
            </div>
          ) : (
            <PriceChart
              candles={chartCandles}
              volume={chartVolume}
              levels={levels}
              height={chartH}
              showVolume
              visibleCandles={TF_VISIBLE[timeframe]}
            />
          )}
        </div>

        {/* ── Sidebar ── */}
        <div style={{ width: 228, display: "flex", flexDirection: "column", borderLeft: `1px solid ${BORDER}`, flexShrink: 0, overflow: "hidden" }}>

          {/* Signal */}
          <div style={{ flexShrink: 0, borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", background: "var(--bg-elevated)", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 700 }}>{t("market.signal")}</span>
              {run && (
                <span style={{
                  fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 700,
                  padding: "2px 7px",
                  color: run.decision === "buy" ? "var(--positive)" : "var(--text-3)",
                  background: run.decision === "buy" ? "rgba(0,230,118,0.08)" : "transparent",
                  border: run.decision === "buy" ? "1px solid rgba(0,230,118,0.2)" : "1px solid transparent",
                }}>
                  {run.decision}
                </span>
              )}
            </div>

            {run ? (
              <div>
                {/* Score */}
                <div style={{ padding: "10px 12px 8px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", fontWeight: 600 }}>{t("market.score")}</span>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: "0.08em", color: "var(--text-3)" }}>/ 100</span>
                    </div>
                    <div style={{ height: 8, background: "rgba(255,255,255,0.12)", position: "relative" }}>
                      <div style={{
                        position: "absolute", top: 0, left: 0, bottom: 0,
                        width: `${Math.min(score, 100)}%`,
                        background: score >= 60
                          ? "#00e676"
                          : score >= 30
                          ? "#f0a500"
                          : "#ff3b3b",
                        transition: "width 0.6s cubic-bezier(0.25,1,0.5,1)",
                        boxShadow: score >= 60
                          ? "0 0 8px #00e676"
                          : score >= 30
                          ? "0 0 8px #f0a500"
                          : "none",
                      }} />
                      {/* threshold marker at 60 */}
                      <div style={{ position: "absolute", left: "60%", top: 0, bottom: 0, width: 2, background: "rgba(255,255,255,0.5)" }} />
                    </div>
                  </div>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 26, lineHeight: 1, color: score >= 60 ? "var(--positive)" : score >= 30 ? "var(--accent)" : "var(--negative)" }}>
                    {score.toFixed(0)}
                  </span>
                </div>

                {/* Layers — fixed max height, scrollable */}
                <div style={{ maxHeight: 300, overflowY: "auto", padding: "0 12px 8px" }}>
                {(() => {
                  const GATE_LAYERS    = new Set(["ema200_filter", "atr_range_filter", "volume_filter"]);
                  const SETUP_LAYERS   = new Set(["ema2050_setup"]);
                  const CONFIRM_LAYERS = new Set(["rsi_confirmation", "mfi_confirmation", "cmf_confirmation", "breakout_confirmation"]);
                  // STRUCT = everything else (fractal_structure, alligator_structure, heikin_ashi_structure)

                  const getGroup = (name: string) =>
                    GATE_LAYERS.has(name) ? "GATE" :
                    SETUP_LAYERS.has(name) ? "SETUP" :
                    CONFIRM_LAYERS.has(name) ? "CONFIRM" : "STRUCT";

                  const GATE_COLOR    = "rgba(255,59,59,0.65)";
                  const SETUP_COLOR   = "rgba(240,165,0,0.65)";
                  const CONFIRM_COLOR = "rgba(150,150,255,0.65)";
                  const STRUCT_COLOR  = "rgba(100,200,200,0.65)";
                  const groupColor = (g: string) =>
                    g === "GATE" ? GATE_COLOR : g === "SETUP" ? SETUP_COLOR : g === "CONFIRM" ? CONFIRM_COLOR : STRUCT_COLOR;

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {run.trace.map((l, i) => {
                        const group = getGroup(l.layer);
                        const isGate = group === "GATE";
                        const prevGroup = i > 0 ? getGroup(run.trace[i - 1]!.layer) : null;
                        const showSep = prevGroup !== null && prevGroup !== group;

                        return (
                          <div key={i}>
                            {(i === 0 || showSep) && (
                              <div style={{ padding: "4px 6px 3px", display: "flex", alignItems: "center", gap: 5 }}>
                                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
                                <span style={{ fontFamily: "var(--font-ui)", fontSize: 8, letterSpacing: "0.14em", color: groupColor(group), fontWeight: 700 }}>
                                  {group}
                                </span>
                                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
                              </div>
                            )}
                            <div style={{
                              padding: "4px 6px 4px 4px",
                              background: l.passed ? "rgba(0,230,118,0.04)" : "transparent",
                              borderLeft: `2px solid ${isGate && !l.passed ? "rgba(255,59,59,0.35)" : l.passed ? "var(--positive)" : "rgba(255,255,255,0.05)"}`,
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, width: 7, textAlign: "center", color: l.passed ? "var(--positive)" : isGate ? "var(--negative)" : "var(--text-3)" }}>
                                  {l.passed ? "●" : "○"}
                                </span>
                                <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.04em", flex: 1, color: l.passed ? "var(--text-1)" : "var(--text-3)" }}>
                                  {layerLabel(l.layer)}
                                </span>
                                {l.contribution > 0 && (
                                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--positive)", fontWeight: 600 }}>+{l.contribution}</span>
                                )}
                              </div>
                              <div style={{ display: "flex", gap: 6, paddingLeft: 12, marginTop: 1 }}>
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: l.passed ? "var(--text-2)" : isGate ? "rgba(255,100,100,0.9)" : "var(--text-3)", fontWeight: 600 }}>
                                  {fmtLayerVal(l.value)}
                                </span>
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)" }}>
                                  / {fmtLayerVal(l.threshold)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                </div>
              </div>
            ) : (
              <div style={{ padding: "16px 12px", textAlign: "center" }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.08em", color: "var(--text-3)", textTransform: "uppercase" }}>
                  {t("market.no_evaluation")}
                </span>
              </div>
            )}
          </div>

          {/* Position */}
          <div style={{ flexShrink: 0, borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", background: "var(--bg-elevated)", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 700 }}>{t("market.position")}</span>
              <span style={{
                fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 700,
                padding: "2px 7px",
                color: pos ? "var(--positive)" : "var(--text-3)",
                background: pos ? "rgba(0,230,118,0.08)" : "transparent",
                border: pos ? "1px solid rgba(0,230,118,0.2)" : "1px solid transparent",
              }}>
                {pos ? t("market.long") : t("market.flat")}
              </span>
            </div>
            {pos ? (
              <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                {([
                  { label: t("market.entry"), value: "$" + fmt(pos.avgEntry, priceDecimals), color: "var(--accent)" },
                  { label: t("table.sl"),     value: pos.sl ? "$" + fmt(pos.sl, priceDecimals) : "—", color: "var(--negative)" },
                  { label: t("table.tp"),     value: pos.tp ? "$" + fmt(pos.tp, priceDecimals) : "—", color: "var(--positive)" },
                ] as const).map(({ label, value, color }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", fontWeight: 600 }}>{label}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color, fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
                {/* R:R */}
                {pos.sl && pos.tp && (() => {
                  const e = parseFloat(pos.avgEntry), s = parseFloat(pos.sl), t = parseFloat(pos.tp);
                  const rr = Math.abs(t - e) / Math.abs(e - s);
                  return (
                    <div style={{ paddingTop: 6, borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", fontWeight: 600 }}>R:R</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: rr >= 2 ? "var(--positive)" : "var(--accent)", fontWeight: 600 }}>
                        1 : {rr.toFixed(1)}
                      </span>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div style={{ padding: "14px 12px", textAlign: "center" }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.08em", color: "var(--text-3)", textTransform: "uppercase" }}>{t("market.no_position")}</span>
              </div>
            )}
          </div>

          {/* Recent bars */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", background: "var(--bg-elevated)", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 700 }}>{t("market.recent_bars")}</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--text-3)" }}>{timeframe}</span>
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              <table className="bb-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>CLOSE</th>
                    <th>VOL</th>
                    <th>O→C</th>
                  </tr>
                </thead>
                <tbody>
                  {candles.slice(-10).reverse().map(c => {
                    const up  = c.close >= c.open;
                    const chg = c.open > 0 ? ((c.close - c.open) / c.open) * 100 : 0;
                    return (
                      <tr key={c.time}>
                        <td style={{ color: up ? "var(--positive)" : "var(--negative)", fontWeight: 600 }}>
                          {fmt(c.close, c.close > 1000 ? 0 : 2)}
                        </td>
                        <td style={{ color: "var(--text-3)" }}>
                          {c.volume > 1000 ? (c.volume / 1000).toFixed(0) + "K" : c.volume.toFixed(1)}
                        </td>
                        <td style={{ color: up ? "var(--positive)" : "var(--negative)" }}>
                          {pct(chg, false)}{up ? "▲" : "▼"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
