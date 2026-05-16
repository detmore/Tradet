"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n";
import { useMode } from "@/hooks/use-mode";

const NAV_KEYS = [
  { href: "/overview",   key: "nav.overview",  code: "01" },
  { href: "/portfolio",  key: "nav.portfolio", code: "02" },
  { href: "/trades",     key: "nav.trades",    code: "03" },
  { href: "/analytics",  key: "nav.analytics", code: "04" },
  { href: "/market",     key: "nav.market",    code: "05" },
  { href: "/alerts",     key: "nav.alerts",    code: "06" },
  { href: "/settings",   key: "nav.settings",  code: "07" },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useT();
  const mode = useMode();
  const isPaper = mode === "paper";

  return (
    <aside
      className="flex h-full w-52 flex-col relative"
      style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border)" }}
    >
      {/* Amber accent line at top */}
      <div className="rule-amber" />

      {/* Logo */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-baseline gap-2">
          <span
            className="font-display text-2xl tracking-widest"
            style={{ color: "var(--accent)", letterSpacing: "0.15em" }}
          >
            TRADET
          </span>
          <span
            className="font-ui text-xs font-semibold tracking-widest"
            style={{ color: "var(--text-3)", letterSpacing: "0.2em" }}
          >
            SYS
          </span>
        </div>
        {/* Mode badge */}
        <div className="mt-2 flex items-center gap-2">
          <span
            className="pulse-dot inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: isPaper ? "var(--accent)" : "var(--negative)" }}
          />
          <span
            className="font-ui text-xs font-semibold tracking-widest"
            style={{ color: isPaper ? "var(--accent)" : "var(--negative)", letterSpacing: "0.15em" }}
          >
            {isPaper ? t("common.paper") : t("common.live")}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2">
        {NAV_KEYS.map(({ href, key, code }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 px-5 py-2.5 relative transition-colors"
              style={{
                background: active ? "var(--accent-dim)" : "transparent",
              }}
            >
              {/* Active indicator */}
              {active && (
                <span
                  className="absolute left-0 top-0 bottom-0 w-[2px]"
                  style={{ background: "var(--accent)" }}
                />
              )}
              <span
                className="font-code text-xs w-5 shrink-0"
                style={{ color: active ? "var(--accent)" : "var(--text-3)" }}
              >
                {code}
              </span>
              <span
                className="font-ui text-sm font-medium tracking-wider uppercase transition-colors"
                style={{
                  color: active ? "var(--text-1)" : "var(--text-2)",
                  letterSpacing: "0.08em",
                }}
              >
                {t(key)}
              </span>
              {/* Hover accent */}
              {!active && (
                <span
                  className="absolute left-0 top-0 bottom-0 w-[2px] opacity-0 group-hover:opacity-40 transition-opacity"
                  style={{ background: "var(--accent)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Kill switch */}
      <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
        <KillSwitchButton />
      </div>
    </aside>
  );
}

function KillSwitchButton() {
  const t = useT();
  return (
    <button
      className="w-full flex items-center justify-center gap-2 py-2.5 transition-all"
      style={{
        border: "1px solid rgba(255,59,59,0.25)",
        background: "rgba(255,59,59,0.05)",
        color: "#ff3b3b",
        fontFamily: "var(--font-ui)",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.15em",
      }}
      onClick={() => {
        if (confirm("Activate kill switch? All trading will halt immediately.")) {
          void fetch("/api/settings/kill-switch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: true }),
          }).then(() => window.location.reload());
        }
      }}
    >
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px" }}>■</span>
      {t("sidebar.kill_switch")}
    </button>
  );
}
