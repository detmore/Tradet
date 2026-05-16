"use client";

import { useState, useEffect } from "react";
import type { SettingsData } from "./settings-content";
import { useT } from "@/lib/i18n";

interface Props { data: SettingsData | null; onSave: (ep: string, body: unknown) => Promise<void>; }

const TFS = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;

export function StrategyTab({ data, onSave }: Props) {
  const cfg = data?.config;
  const t   = useT();
  const thresholds = (cfg?.thresholds ?? {}) as Record<string, number>;

  const [tf,     setTf]     = useState(cfg?.timeframe ?? "15m");
  const [syms,   setSyms]   = useState(Array.isArray(cfg?.symbols) ? (cfg.symbols as string[]).join(", ") : "BTC/USDT");
  const [score,  setScore]  = useState(String(thresholds["scoreThreshold"] ?? 60));
  const [rsiMin, setRsiMin] = useState(String(thresholds["rsiMin"] ?? 55));
  const [rsiMax, setRsiMax] = useState(String(thresholds["rsiMax"] ?? 70));
  const [volMul, setVolMul] = useState(String(thresholds["volSmaMultiplier"] ?? 1.0));
  const [cross,  setCross]  = useState(String(thresholds["emaCrossoverBars"] ?? 5));

  useEffect(() => {
    if (!cfg) return;
    setTf(cfg.timeframe);
    setSyms(Array.isArray(cfg.symbols) ? (cfg.symbols as string[]).join(", ") : "BTC/USDT");
    const th = cfg.thresholds as Record<string, number>;
    setScore(String(th["scoreThreshold"] ?? 60));
    setRsiMin(String(th["rsiMin"] ?? 55));
    setRsiMax(String(th["rsiMax"] ?? 70));
    setVolMul(String(th["volSmaMultiplier"] ?? 1.0));
    setCross(String(th["emaCrossoverBars"] ?? 5));
  }, [cfg]);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => void onSave("/api/settings/strategy", {
    id: cfg?.id,
    timeframe: tf,
    symbols: syms.split(",").map(s => s.trim()).filter(Boolean),
    thresholds: { ...(cfg?.thresholds as object), scoreThreshold: +score, rsiMin: +rsiMin, rsiMax: +rsiMax, volSmaMultiplier: +volMul, emaCrossoverBars: +cross },
  });

  return (
    <div>
      <SectionHeader title={t("settings.strategy.title")} sub={t("settings.strategy.sub")} />

      <Row label={t("settings.strategy.timeframe")} desc={t("settings.strategy.timeframe_desc")}>
        <div style={{ display: "flex", gap: 2 }}>
          {TFS.map(frame => (
            <button key={frame} onClick={() => setTf(frame)} style={{
              fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.08em",
              padding: "5px 12px", cursor: "pointer", borderRadius: 0, border: "1px solid",
              borderColor: tf === frame ? "var(--accent-border)" : "rgba(255,255,255,0.10)",
              background: tf === frame ? "var(--accent-dim)" : "transparent",
              color: tf === frame ? "var(--accent)" : "var(--text-3)", fontWeight: tf === frame ? 700 : 400,
              transition: "all 0.1s",
            }}>{frame}</button>
          ))}
        </div>
      </Row>

      {(tf === "1m" || tf === "5m") && (
        <div style={{ margin: "4px 0 8px", padding: "8px 12px", background: "rgba(240,165,0,0.07)", borderLeft: "2px solid var(--accent)" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--accent)", letterSpacing: "0.04em", lineHeight: 1.5 }}>
            {tf} kısa vadeli bir zaman dilimidir. EMA200 filtresi {tf === "1m" ? "son 3.3 saati" : "son 16.6 saati"} kapsar — trend tespiti için yetersiz olabilir. RSI/MFI/CMF bu aralıkta çok değişken davranır ve sahte sinyal üretme riski artar. Sistem 1h+ için optimize edilmiştir.
          </span>
        </div>
      )}

      <Row label={t("settings.strategy.symbols")} desc={t("settings.strategy.symbols_desc")}>
        <Input value={syms} onChange={setSyms} />
      </Row>

      <div style={{ marginTop: 16, marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-3)", fontWeight: 600 }}>{t("settings.strategy.thresholds")}</span>
      </div>

      <Row label={t("settings.strategy.score_threshold")} desc={t("settings.strategy.score_desc")}>
        <Input value={score} onChange={setScore} type="number" min="0" />
      </Row>
      <Row label={t("settings.strategy.rsi_range")} desc={t("settings.strategy.rsi_desc")}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Input value={rsiMin} onChange={setRsiMin} type="number" min="0" />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>—</span>
          <Input value={rsiMax} onChange={setRsiMax} type="number" min="0" />
        </div>
      </Row>
      <Row label={t("settings.strategy.vol_mult")} desc={t("settings.strategy.vol_desc")}>
        <Input value={volMul} onChange={setVolMul} type="number" step="0.1" min="0" />
      </Row>
      <Row label={t("settings.strategy.ema_bars")} desc={t("settings.strategy.ema_desc")}>
        <Input value={cross} onChange={setCross} type="number" min="1" />
      </Row>

      <SaveBtn onClick={handleSave} t={t} />
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="bb-sep-accent" style={{ marginBottom: 8 }} />
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: "0.12em", color: "var(--text-1)" }}>{title.toUpperCase()}</span>
        {sub && <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{sub}</span>}
      </div>
    </div>
  );
}
function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, letterSpacing: "0.04em", color: "var(--text-1)", fontWeight: 600 }}>{label}</div>
        {desc && <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}
function Input({ value, onChange, type = "text", step, min }: { value: string; onChange: (v: string) => void; type?: string; step?: string; min?: string }) {
  return (
    <input type={type} value={value} step={step} min={min} onChange={e => onChange(e.target.value)}
      style={{ fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 0, padding: "6px 10px", width: 130, outline: "none" }}
      onFocus={e => (e.target.style.borderColor = "var(--accent)")}
      onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.10)")}
    />
  );
}
function SaveBtn({ onClick, t }: { onClick: () => void; t: (k: string) => string }) {
  return (
    <button onClick={onClick} style={{ marginTop: 24, fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, padding: "9px 24px", cursor: "pointer", background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-border)", borderRadius: 0 }}
      onMouseEnter={e => { const b = e.currentTarget; b.style.background = "var(--accent)"; b.style.color = "var(--bg)"; }}
      onMouseLeave={e => { const b = e.currentTarget; b.style.background = "var(--accent-dim)"; b.style.color = "var(--accent)"; }}
    >{t("common.save")}</button>
  );
}
