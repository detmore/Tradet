"use client";

import { useState, useEffect } from "react";
import type { SettingsData } from "./settings-content";
import { useT } from "@/lib/i18n";

interface Props { data: SettingsData | null; onSave: (ep: string, body: unknown) => Promise<void>; }

export function ExitsTab({ data, onSave }: Props) {
  const t = useT();
  const e = (data?.config?.exits ?? {}) as Record<string, unknown>;
  const [sl,       setSl]       = useState(String(e["slAtrMult"] ?? 1.5));
  const [tp,       setTp]       = useState(String(e["tpAtrMult"] ?? 2.5));
  const [trailing, setTrailing] = useState(Boolean(e["trailingEnabled"] ?? false));

  useEffect(() => {
    if (!data?.config) return;
    const ex = data.config.exits as Record<string, unknown>;
    setSl(String(ex["slAtrMult"] ?? 1.5));
    setTp(String(ex["tpAtrMult"] ?? 2.5));
    setTrailing(Boolean(ex["trailingEnabled"] ?? false));
  }, [data]);

  const slV = parseFloat(sl) || 1.5;
  const tpV = parseFloat(tp) || 2.5;
  const rr  = tpV / slV;

  const handleSave = () => void onSave("/api/settings/strategy", {
    id: data?.config?.id,
    exits: { slAtrMult: slV, tpAtrMult: tpV, trailingEnabled: trailing },
  });

  return (
    <div>
      <SectionHeader title={t("settings.exits.title")} sub={t("settings.exits.sub")} />

      <Row label={t("settings.exits.sl")} desc={`${t("settings.exits.sl_desc")} ${sl}`}>
        <Input value={sl} onChange={setSl} type="number" step="0.1" min="0.1" />
      </Row>
      <Row label={t("settings.exits.tp")} desc={`${t("settings.exits.tp_desc")} ${tp}`}>
        <Input value={tp} onChange={setTp} type="number" step="0.1" min="0.5" />
      </Row>
      <Row label={t("settings.exits.trailing")} desc={t("settings.exits.trailing_desc")}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Toggle on={trailing} onChange={setTrailing} />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: trailing ? "var(--positive)" : "var(--text-3)", fontWeight: 600 }}>
            {trailing ? t("settings.exits.on") : t("settings.exits.off")}
          </span>
        </div>
      </Row>

      {/* R:R visual */}
      <div style={{ marginTop: 20, padding: "16px", background: "var(--bg-elevated)", borderLeft: `2px solid ${rr >= 2 ? "var(--positive)" : rr >= 1.5 ? "var(--accent)" : "var(--negative)"}` }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: "0.12em", color: "var(--text-3)", marginBottom: 6, textTransform: "uppercase", fontWeight: 600 }}>{t("settings.exits.rr_ratio")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 32, lineHeight: 1, color: rr >= 2 ? "var(--positive)" : rr >= 1.5 ? "var(--accent)" : "var(--negative)" }}>
            1 : {rr.toFixed(1)}
          </span>
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-3)" }}>SL: {slV}× ATR</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-3)" }}>TP: {tpV}× ATR</div>
          </div>
        </div>
        {/* R:R bar */}
        <div style={{ marginTop: 10, height: 4, background: "rgba(255,255,255,0.07)", position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min((slV / (slV + tpV)) * 100, 100)}%`, background: "var(--negative)" }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${Math.min((tpV / (slV + tpV)) * 100, 100)}%`, background: "var(--positive)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, color: "var(--negative)" }}>{t("settings.exits.stop")}</span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, color: "var(--positive)" }}>{t("settings.exits.target")}</span>
        </div>
      </div>

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
      style={{ fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 0, padding: "6px 10px", width: 100, outline: "none" }}
      onFocus={e => (e.target.style.borderColor = "var(--accent)")}
      onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.10)")}
    />
  );
}
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{ width: 40, height: 20, position: "relative", cursor: "pointer", background: on ? "rgba(0,230,118,0.2)" : "rgba(255,255,255,0.06)", border: `1px solid ${on ? "rgba(0,230,118,0.4)" : "rgba(255,255,255,0.12)"}`, borderRadius: 0, transition: "all 0.15s", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 2, bottom: 2, width: 16, left: on ? "calc(100% - 18px)" : 2, background: on ? "var(--positive)" : "rgba(255,255,255,0.2)", transition: "left 0.15s" }} />
    </button>
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
