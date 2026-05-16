"use client";

import { useState, useEffect } from "react";
import type { SettingsData } from "./settings-content";
import { useT } from "@/lib/i18n";

interface Props { data: SettingsData | null; onSave: (ep: string, body: unknown) => Promise<void>; }

export function RiskTab({ data, onSave }: Props) {
  const t = useT();
  const r = (data?.config?.risk ?? {}) as Record<string, number>;
  const [rpt,  setRpt]  = useState(String(((r["riskPerTrade"] ?? 0.005) * 100).toFixed(2)));
  const [mdl,  setMdl]  = useState(String(((r["maxDailyLoss"] ?? 0.02) * 100).toFixed(1)));
  const [moe,  setMoe]  = useState(String(((r["maxOpenExposure"] ?? 0.03) * 100).toFixed(1)));
  const [clp,  setClp]  = useState(String(r["consecutiveLossPause"] ?? 3));
  const [cdh,  setCdh]  = useState(String(r["cooldownDurationHours"] ?? 4));

  useEffect(() => {
    if (!data?.config) return;
    const rv = data.config.risk as Record<string, number>;
    setRpt(String(((rv["riskPerTrade"] ?? 0.005) * 100).toFixed(2)));
    setMdl(String(((rv["maxDailyLoss"] ?? 0.02) * 100).toFixed(1)));
    setMoe(String(((rv["maxOpenExposure"] ?? 0.03) * 100).toFixed(1)));
    setClp(String(rv["consecutiveLossPause"] ?? 3));
    setCdh(String(rv["cooldownDurationHours"] ?? 4));
  }, [data]);

  const handleSave = () => void onSave("/api/settings/strategy", {
    id: data?.config?.id,
    risk: { riskPerTrade: +rpt / 100, maxDailyLoss: +mdl / 100, maxOpenExposure: +moe / 100, consecutiveLossPause: +clp, cooldownDurationHours: +cdh },
  });

  const ROWS = [
    { label: t("settings.risk.per_trade"), desc: t("settings.risk.per_trade_desc"), val: rpt, set: setRpt, step: "0.01", suffix: "%" },
    { label: t("settings.risk.max_daily"), desc: t("settings.risk.max_daily_desc"), val: mdl, set: setMdl, step: "0.1", suffix: "%" },
    { label: t("settings.risk.max_exposure"), desc: t("settings.risk.max_exposure_desc"), val: moe, set: setMoe, step: "0.1", suffix: "%" },
    { label: t("settings.risk.consec_loss"), desc: t("settings.risk.consec_desc"), val: clp, set: setClp, step: "1", suffix: undefined },
    { label: t("settings.risk.cooldown"), desc: t("settings.risk.cooldown_desc"), val: cdh, set: setCdh, step: "1", suffix: undefined },
  ] as const;

  return (
    <div>
      <SectionHeader title={t("settings.risk.title")} sub={t("settings.risk.sub")} />
      {ROWS.map(({ label, desc, val, set, step, suffix }) => (
        <Row key={label} label={label} desc={desc}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Input value={val} onChange={set} type="number" step={step} min="0" />
            {suffix && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>{suffix}</span>}
          </div>
        </Row>
      ))}

      {/* Visual summary */}
      <div style={{ marginTop: 20, padding: "14px 16px", background: "var(--bg-elevated)", borderLeft: "2px solid var(--accent-border)" }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: "0.12em", color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase", fontWeight: 600 }}>{t("settings.risk.summary")}</div>
        <div style={{ display: "flex", gap: 24 }}>
          {[
            { k: t("settings.risk.per_trade_short"), v: rpt + "%" },
            { k: t("settings.risk.daily_max"), v: mdl + "%" },
            { k: t("settings.risk.exposure"), v: moe + "%" },
            { k: t("settings.risk.cooldown_short"), v: cdh + "h" },
          ].map(({ k, v }) => (
            <div key={k}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.10em", textTransform: "uppercase" }}>{k}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--accent)", lineHeight: 1.2 }}>{v}</div>
            </div>
          ))}
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
function SaveBtn({ onClick, t }: { onClick: () => void; t: (k: string) => string }) {
  return (
    <button onClick={onClick} style={{ marginTop: 24, fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, padding: "9px 24px", cursor: "pointer", background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-border)", borderRadius: 0 }}
      onMouseEnter={e => { const b = e.currentTarget; b.style.background = "var(--accent)"; b.style.color = "var(--bg)"; }}
      onMouseLeave={e => { const b = e.currentTarget; b.style.background = "var(--accent-dim)"; b.style.color = "var(--accent)"; }}
    >{t("common.save")}</button>
  );
}
