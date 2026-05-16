"use client";

import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n";
import { useMode } from "@/hooks/use-mode";

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  const [time, setTime] = useState("");
  const t = useT();
  const mode = useMode();
  const isPaper = mode === "paper";

  useEffect(() => {
    const tick = () => setTime(
      new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Istanbul", hour12: false })
    );
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header
      className="flex items-center px-6 relative"
      style={{ height: "48px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, var(--accent) 0%, transparent 60%)" }}
      />
      <h1
        className="font-display text-xl flex-1"
        style={{ color: "var(--text-1)", letterSpacing: "0.15em" }}
      >
        {title.toUpperCase()}
      </h1>
      <div className="flex items-center gap-5">
        {time && (
          <span className="font-code text-xs" style={{ color: "var(--text-3)" }}>
            {time} TR
          </span>
        )}
        <div className="flex items-center gap-2">
          <span
            className="pulse-dot h-1.5 w-1.5 rounded-full inline-block"
            style={{ background: isPaper ? "var(--positive)" : "var(--negative)" }}
          />
          <span
            className="font-ui text-xs font-semibold tracking-widest"
            style={{ color: isPaper ? "var(--text-2)" : "var(--negative)", letterSpacing: "0.12em" }}
          >
            {isPaper ? t("topbar.paper") : t("topbar.live")}
          </span>
        </div>
      </div>
    </header>
  );
}
