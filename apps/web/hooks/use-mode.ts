"use client";

import { useState, useEffect, useCallback } from "react";
import { useSse } from "./use-sse";

type Mode = "paper" | "live";

export function useMode(): Mode {
  const [mode, setMode] = useState<Mode>("paper");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) return;
      const json = await res.json() as { settings: { mode: string } | null };
      const raw = json.settings?.mode;
      if (raw === "paper" || raw === "live") setMode(raw);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useSse(e => {
    if (e["type"] === "settings_event") void load();
  });

  return mode;
}
