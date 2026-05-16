"use client";

import { useState } from "react";
import { Power } from "lucide-react";

export function KillSwitchButton() {
  const [confirming, setConfirming] = useState(false);

  const handleClick = async () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3_000);
      return;
    }
    setConfirming(false);
    try {
      await fetch("/api/settings/kill-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      window.location.reload();
    } catch {
      // silent — user will see no change
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
        confirming
          ? "bg-red-600 text-white"
          : "bg-zinc-800 text-red-400 hover:bg-red-900/40 hover:text-red-300"
      }`}
    >
      <Power className="h-3.5 w-3.5" />
      {confirming ? "Confirm kill switch" : "Kill switch"}
    </button>
  );
}
