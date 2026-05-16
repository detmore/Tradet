"use client";

import { useT } from "@/lib/i18n";

export function AlertsTab() {
  const t = useT();
  const B = "rgba(255,255,255,0.07)";
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="bb-sep-accent" style={{ marginBottom: 8 }} />
        <span style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: "0.12em", color: "var(--text-1)" }}>{t("settings.alerts.events").toUpperCase()}</span>
      </div>

      {/* Telegram setup */}
      <div style={{ border: `1px solid ${B}`, marginBottom: 16 }}>
        <div className="bb-panel-hdr">
          <span>{t("settings.alerts.telegram")}</span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, color: "var(--text-3)" }}>{t("settings.alerts.optional")}</span>
        </div>
        <div style={{ padding: "16px" }}>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-2)", marginBottom: 12, lineHeight: 1.6 }}>
            {t("settings.alerts.env_desc")} <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", background: "var(--bg-elevated)", padding: "1px 5px" }}>.env</code> {t("settings.alerts.env_desc2")}
          </p>
          <div style={{ background: "var(--bg-elevated)", padding: "12px 14px", borderLeft: "2px solid var(--accent-border)", marginBottom: 12 }}>
            <pre style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)", margin: 0, lineHeight: 1.8 }}>
{`TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id`}
            </pre>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { step: "01", text: "Open Telegram → message @BotFather → /newbot" },
              { step: "02", text: "Copy the token to TELEGRAM_BOT_TOKEN" },
              { step: "03", text: "Start a chat with your bot, then open:" },
              { step: "04", text: "api.telegram.org/bot<TOKEN>/getUpdates → copy chat.id" },
            ].map(({ step, text }) => (
              <div key={step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", marginTop: 1, flexShrink: 0 }}>{step}</span>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-3)", lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alert events list */}
      <div style={{ border: `1px solid ${B}` }}>
        <div className="bb-panel-hdr"><span>{t("settings.alerts.events")}</span></div>
        <table className="bb-table" style={{ width: "100%" }}>
          <thead><tr><th>{t("table.event")}</th><th>{t("alerts.channel")}</th></tr></thead>
          <tbody>
            {[
              t("settings.alerts.trade_opened"),
              t("settings.alerts.trade_closed"),
              t("settings.alerts.sl_hit"),
              t("settings.alerts.tp_hit"),
              t("settings.alerts.daily_loss"),
              t("settings.alerts.kill_switch"),
              t("settings.alerts.bot_error"),
              t("settings.alerts.conn_error"),
            ].map((ev) => (
              <tr key={ev}>
                <td style={{ color: "var(--text-2)" }}>{ev}</td>
                <td style={{ color: "var(--text-3)" }}>Telegram + DB</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
