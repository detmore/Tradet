"use client";

import type { SettingsData } from "./settings-content";
import { useT } from "@/lib/i18n";

interface Props { data: SettingsData | null; onSave: (ep: string, body: unknown) => Promise<void>; }

const FLAGS = [
  { key: "useMfi",              label: "MFI",              desc: "Money Flow Index confirmation" },
  { key: "useCmf",              label: "CMF",              desc: "Chaikin Money Flow confirmation" },
  { key: "usePivot",            label: "Pivot",            desc: "Pivot level structure filter" },
  { key: "useFractal",          label: "Fractal",          desc: "Williams Fractal breakout" },
  { key: "useAlligator",        label: "Alligator",        desc: "Bill Williams Alligator trend" },
  { key: "useHeikinAshi",       label: "Heikin Ashi",      desc: "HA candle trend smoothing" },
  { key: "breakoutCloseConfirm",label: "Close Confirm",    desc: "Candle must close beyond level" },
  { key: "retestConfirm",       label: "Retest",           desc: "Wait for level retest" },
] as const;

export function FiltersTab({ data, onSave }: Props) {
  const t     = useT();
  const flags = (data?.config?.flags ?? {}) as Record<string, boolean>;
  const id    = data?.config?.id;

  const toggle = (key: string) => {
    if (!id) return;
    void onSave("/api/settings/strategy", { id, flags: { ...flags, [key]: !flags[key] } });
  };

  return (
    <div>
      <SectionHeader title={t("settings.filters.title")} sub={t("settings.filters.sub")} />
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-3)", marginBottom: 20, letterSpacing: "0.02em" }}>
        {t("settings.filters.desc")}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "rgba(255,255,255,0.05)" }}>
        {FLAGS.map(({ key, label, desc }) => {
          const on = flags[key] ?? false;
          return (
            <div key={key}
              onClick={() => toggle(key)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px", cursor: "pointer", background: "var(--bg-surface)",
                borderLeft: `2px solid ${on ? "var(--positive)" : "rgba(255,255,255,0.04)"}`,
                transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-elevated)")}
              onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-surface)")}
            >
              <div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", color: on ? "var(--text-1)" : "var(--text-3)" }}>{label}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{desc}</div>
              </div>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: on ? "var(--positive)" : "rgba(255,255,255,0.10)",
                boxShadow: on ? "0 0 6px var(--positive)" : "none",
                flexShrink: 0,
              }} />
            </div>
          );
        })}
      </div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)", marginTop: 12 }}>
        {Object.values(flags).filter(Boolean).length} / {FLAGS.length} {t("settings.filters.active")}
      </p>
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
