"use client";

import { useState, useEffect } from "react";
import { GeneralTab }  from "./general-tab";
import { StrategyTab } from "./strategy-tab";
import { FiltersTab }  from "./filters-tab";
import { RiskTab }     from "./risk-tab";
import { ExitsTab }    from "./exits-tab";
import { AlertsTab }   from "./alerts-tab";
import { useT } from "@/lib/i18n";

const TAB_IDS = ["General", "Strategy", "Filters", "Risk", "Exits", "Alerts"] as const;
type TabId = typeof TAB_IDS[number];

const TAB_CODES: Record<TabId, string> = {
  General: "01", Strategy: "02", Filters: "03", Risk: "04", Exits: "05", Alerts: "06",
};

const TAB_KEYS: Record<TabId, string> = {
  General: "settings.general", Strategy: "settings.strategy", Filters: "settings.filters",
  Risk: "settings.risk", Exits: "settings.exits", Alerts: "settings.alerts",
};

export interface SettingsData {
  settings: {
    id: number;
    mode: string;
    paperStartingBalance: string;
    paperCurrentBalance: string;
    accountCurrency: string;
    isRunning: boolean;
    killSwitchActive: boolean;
  } | null;
  config: {
    id: string;
    timeframe: string;
    symbols: string[] | unknown;
    thresholds: Record<string, unknown>;
    flags: Record<string, unknown>;
    risk: Record<string, unknown>;
    exits: Record<string, unknown>;
  } | null;
}

const B = "rgba(255,255,255,0.07)";

export function SettingsContent() {
  const [tab,   setTab]   = useState<TabId>("General");
  const [data,  setData]  = useState<SettingsData | null>(null);
  const [saved, setSaved] = useState(false);
  const t = useT();

  const load = async () => {
    try {
      const res = await fetch("/api/settings");
      setData(await res.json() as SettingsData);
    } catch { /* silent */ }
  };

  useEffect(() => { void load(); }, []);

  const save = async (endpoint: string, body: unknown) => {
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        await load();
      }
    } catch { /* silent */ }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "var(--bg)" }}>

      {/* Horizontal tab bar — visually distinct from the vertical global sidebar */}
      <div style={{ background: "var(--bg-elevated)", borderBottom: `1px solid ${B}`, display: "flex", alignItems: "stretch", flexShrink: 0, position: "relative" }}>
        {TAB_IDS.map(id => {
          const active = tab === id;
          const code = TAB_CODES[id];
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "0 20px", height: 42,
                background: active ? "var(--bg-surface)" : "transparent",
                border: "none",
                borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                borderRight: `1px solid ${B}`,
                cursor: "pointer",
                transition: "all 0.1s",
                position: "relative",
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: active ? "var(--accent)" : "var(--text-3)", letterSpacing: "0.06em" }}>
                {code}
              </span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: active ? "var(--text-1)" : "var(--text-3)", fontWeight: active ? 700 : 500 }}>
                {t(TAB_KEYS[id])}
              </span>
            </button>
          );
        })}

        {/* Saved indicator — floats at right of tab bar */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", paddingRight: 20 }}>
          {saved ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "var(--positive)" }} />
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--positive)", fontWeight: 700 }}>
                {t("common.saved")}
              </span>
            </div>
          ) : (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.06em" }}>
              {t(TAB_KEYS[tab]).toLowerCase()}
            </span>
          )}
        </div>
      </div>

      {/* Content panel */}
      <div style={{ flex: 1, overflow: "auto", padding: "28px 36px" }}>
        {tab === "General"  && <GeneralTab  data={data} onSave={save} onLoad={load} />}
        {tab === "Strategy" && <StrategyTab data={data} onSave={save} />}
        {tab === "Filters"  && <FiltersTab  data={data} onSave={save} />}
        {tab === "Risk"     && <RiskTab     data={data} onSave={save} />}
        {tab === "Exits"    && <ExitsTab    data={data} onSave={save} />}
        {tab === "Alerts"   && <AlertsTab />}
      </div>
    </div>
  );
}
