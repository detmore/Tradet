"use client";

import { useState } from "react";
import type { SettingsData } from "./settings-content";
import { useT, useLang } from "@/lib/i18n";

interface Props {
  data: SettingsData | null;
  onSave: (endpoint: string, body: unknown) => Promise<void>;
  onLoad: () => Promise<void>;
}

export function GeneralTab({ data, onSave, onLoad }: Props) {
  const s = data?.settings;
  const [resetting, setResetting] = useState(false);
  const t = useT();
  const { lang, setLang } = useLang();

  if (!s) return <Skeleton t={t} />;

  const isPaper = s.mode === "paper";

  const handleModeToggle = async () => {
    if (!isPaper && !confirm("Switch back to Paper mode?")) return;
    if (isPaper && !confirm("Switch to LIVE trading? Real orders will be placed.")) return;
    await onSave("/api/settings/bot", { mode: isPaper ? "live" : "paper" });
  };

  const handleReset = async () => {
    if (!confirm(`Reset paper balance to $${parseFloat(s.paperStartingBalance).toFixed(2)}?`)) return;
    setResetting(true);
    try { await fetch("/api/settings/paper-reset", { method: "POST" }); await onLoad(); }
    finally { setResetting(false); }
  };

  return (
    <div>
      <SectionHeader title={t("settings.general.title")} sub={t("settings.general.sub")} />

      {/* Mode card */}
      <div style={{
        marginBottom: 24, padding: "16px", background: "var(--bg-elevated)",
        border: `1px solid ${isPaper ? "rgba(240,165,0,0.2)" : "rgba(255,59,59,0.3)"}`,
        borderLeft: `3px solid ${isPaper ? "var(--accent)" : "var(--negative)"}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: isPaper ? "var(--accent)" : "var(--negative)", letterSpacing: "0.10em" }}>
              {isPaper ? t("settings.general.paper_mode") : t("settings.general.live_mode")}
            </span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.08em", color: "var(--text-3)", marginLeft: 10, textTransform: "uppercase" }}>
              {isPaper ? t("settings.general.simulated") : t("settings.general.real_orders")}
            </span>
          </div>
          <button
            onClick={() => void handleModeToggle()}
            style={{
              fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700,
              padding: "6px 16px", cursor: "pointer", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "var(--text-2)",
              borderRadius: 0, transition: "all 0.1s",
            }}
          >
            {isPaper ? t("settings.general.switch_to_live") : t("settings.general.switch_to_paper")}
          </button>
        </div>
        {isPaper && (
          <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
            <Stat label={t("settings.general.current_balance")} value={`$${parseFloat(s.paperCurrentBalance).toFixed(2)}`} accent />
            <Stat label={t("settings.general.starting_balance")} value={`$${parseFloat(s.paperStartingBalance).toFixed(2)}`} />
            <Stat label={t("settings.general.currency")} value={s.accountCurrency} />
          </div>
        )}
      </div>

      <Row label={t("settings.general.engine")} desc={t("settings.general.engine_desc")}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Toggle on={s.isRunning} onChange={(v) => void onSave("/api/settings/bot", { isRunning: v })} />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: s.isRunning ? "var(--positive)" : "var(--text-3)", fontWeight: 600 }}>
            {s.isRunning ? t("settings.general.running") : t("settings.general.stopped")}
          </span>
        </div>
      </Row>

      <Row label={t("settings.general.kill_switch")} desc={t("settings.general.kill_switch_desc")}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Toggle on={s.killSwitchActive} onChange={(v) => void onSave("/api/settings/bot", { killSwitchActive: v })} danger />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: s.killSwitchActive ? "var(--negative)" : "var(--text-3)", fontWeight: 600 }}>
            {s.killSwitchActive ? t("settings.general.active") : t("settings.general.off_state")}
          </span>
        </div>
      </Row>

      {isPaper && (
        <Row label={t("settings.general.reset_balance")} desc={t("settings.general.reset_desc")}>
          <button
            onClick={() => void handleReset()}
            disabled={resetting}
            style={{
              fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 700,
              padding: "6px 14px", cursor: resetting ? "not-allowed" : "pointer", opacity: resetting ? 0.5 : 1,
              background: "transparent", color: "var(--text-3)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 0,
            }}
          >
            {resetting ? t("settings.general.resetting") : t("settings.general.reset_btn")}
          </button>
        </Row>
      )}

      <Row label={t("settings.general.language")} desc={t("settings.general.language_desc")}>
        <div style={{ display: "flex", gap: 2 }}>
          {(["tr", "en"] as const).map(l => {
            const active = lang === l;
            return (
              <button key={l} onClick={() => setLang(l)} style={{
                fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
                padding: "5px 12px", cursor: "pointer", borderRadius: 0, border: "1px solid",
                borderColor: active ? "var(--accent-border)" : "rgba(255,255,255,0.10)",
                background: active ? "var(--accent-dim)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-3)",
                fontWeight: active ? 700 : 400, transition: "all 0.1s",
              }}>{l === "tr" ? "Türkçe" : "English"}</button>
            );
          })}
        </div>
      </Row>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: accent ? "var(--accent)" : "var(--text-1)", fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Skeleton({ t }: { t: (k: string) => string }) {
  return <div style={{ color: "var(--text-3)", fontFamily: "var(--font-ui)", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", padding: "24px 0" }}>{t("common.loading")}</div>;
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

function Toggle({ on, onChange, danger }: { on: boolean; onChange: (v: boolean) => void; danger?: boolean }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 40, height: 20, position: "relative", cursor: "pointer",
        background: on ? (danger ? "rgba(255,59,59,0.25)" : "rgba(0,230,118,0.2)") : "rgba(255,255,255,0.06)",
        border: `1px solid ${on ? (danger ? "rgba(255,59,59,0.5)" : "rgba(0,230,118,0.4)") : "rgba(255,255,255,0.12)"}`,
        borderRadius: 0, transition: "all 0.15s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 2, bottom: 2, width: 16,
        left: on ? "calc(100% - 18px)" : 2,
        background: on ? (danger ? "var(--negative)" : "var(--positive)") : "rgba(255,255,255,0.2)",
        transition: "left 0.15s",
      }} />
    </button>
  );
}
