import { cn } from "@/lib/utils";
import { ModeBadge } from "@/components/shell/mode-badge";

interface RiskStatusPanelProps {
  mode: "paper" | "live";
  isRunning: boolean;
  killSwitchActive: boolean;
}

export function RiskStatusPanel({ mode, isRunning, killSwitchActive }: RiskStatusPanelProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</p>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Mode</span>
          <ModeBadge mode={mode} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Engine</span>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isRunning ? "bg-emerald-400" : "bg-zinc-600"
              )}
            />
            <span className={isRunning ? "text-emerald-400" : "text-zinc-500"}>
              {isRunning ? "Running" : "Stopped"}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Kill Switch</span>
          <span className={killSwitchActive ? "text-rose-400 font-medium" : "text-zinc-500"}>
            {killSwitchActive ? "Active" : "Off"}
          </span>
        </div>
      </div>
    </div>
  );
}
