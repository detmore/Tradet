"use client";

import { useState, useEffect, useCallback } from "react";
import { useSse } from "@/hooks/use-sse";
import { useT } from "@/lib/i18n";

interface AlertRow {
  id: string; severity: string; category: string; title: string;
  body: string; sentAt: string; deliveryStatus: string; channel: string;
}

const SEV_KEYS = ["all", "warning", "error", "critical"] as const;
type SevFilter = typeof SEV_KEYS[number];

const sevColor = (s: string) =>
  s === "critical" ? "var(--negative)" : s === "error" ? "#ff6b6b" : s === "warning" ? "var(--accent)" : "var(--text-3)";

const statusColor = (s: string) =>
  s === "sent" ? "var(--positive)" : s === "failed" ? "var(--negative)" : "var(--text-3)";

export function AlertsContent() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [filter, setFilter] = useState<SevFilter>("all");
  const t = useT();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts");
      const json = await res.json() as { alerts: AlertRow[] };
      setAlerts(json.alerts ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useSse(e => { if (e["type"] === "alert") void load(); });

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.severity === filter);

  return (
    <div style={{ padding: "1px", display: "flex", flexDirection: "column", gap: 1, background: "rgba(255,255,255,0.06)" }}>

      {/* ── FILTER BAR ── */}
      <div style={{ background: "var(--bg-surface)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 2 }}>
        {SEV_KEYS.map(s => {
          const active = filter === s;
          const label = s === "all" ? t("alerts.all") : s === "warning" ? t("alerts.warning") : s === "error" ? t("alerts.error") : t("alerts.critical");
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700,
                padding: "5px 14px", cursor: "pointer", borderRadius: 0, border: "1px solid",
                borderColor: active ? (s === "all" ? "var(--accent-border)" : sevColor(s) + "66") : "rgba(255,255,255,0.08)",
                background: active ? (s === "all" ? "var(--accent-dim)" : sevColor(s) + "18") : "transparent",
                color: active ? (s === "all" ? "var(--accent)" : sevColor(s)) : "var(--text-3)",
                transition: "all 0.1s",
              }}
            >
              {label}
            </button>
          );
        })}
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)" }}>
          {filtered.length} {t("alerts.alerts")}
        </span>
      </div>

      {/* ── TABLE ── */}
      <div style={{ background: "var(--bg-surface)" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-3)", letterSpacing: "0.08em" }}>
            {t("alerts.no_alerts")}
          </div>
        ) : (
          <table className="bb-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: 16 }} />
                <th>{t("table.severity")}</th>
                <th>{t("table.event")}</th>
                <th>{t("table.category")}</th>
                <th>{t("alerts.channel")}</th>
                <th>{t("alerts.status")}</th>
                <th style={{ textAlign: "right" }}>{t("table.time")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  <td>
                    <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: sevColor(a.severity) }} />
                  </td>
                  <td>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: sevColor(a.severity) }}>
                      {a.severity.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-2)" }}>{a.title}</td>
                  <td style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {a.category.replace(/_/g, " ")}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>{a.channel}</td>
                  <td>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: statusColor(a.deliveryStatus) }}>
                      {a.deliveryStatus.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", textAlign: "right" }}>
                    {new Date(a.sentAt).toLocaleString("tr-TR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
