import { cn } from "@/lib/utils";

interface LayerResult {
  layer: string;
  passed: boolean;
  value: number | boolean | string;
  contribution: number;
}

interface Props {
  marketData: {
    latestRun: {
      decision: string;
      score: string;
      trace: LayerResult[];
      mandatoryPassed: boolean;
      setupPassed: boolean;
    } | null;
    openPosition: {
      avgEntry: string;
      sl: string | null;
      tp: string | null;
    } | null;
  } | null;
}

export function DecisionStatePanel({ marketData }: Props) {
  const run = marketData?.latestRun;
  const pos = marketData?.openPosition;

  return (
    <div className="space-y-3">
      {/* Current decision */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
          Last Signal
        </p>
        {!run ? (
          <p className="text-sm text-zinc-600">No evaluation yet</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-sm font-semibold uppercase",
                  run.decision === "buy"
                    ? "text-emerald-400"
                    : run.decision === "sell"
                    ? "text-rose-400"
                    : "text-zinc-400"
                )}
              >
                {run.decision}
              </span>
              <span className="font-mono text-xs text-zinc-400">
                Score: {parseFloat(run.score).toFixed(0)}
              </span>
            </div>
            <div className="flex gap-2 text-xs">
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded",
                  run.mandatoryPassed
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-zinc-800 text-zinc-600"
                )}
              >
                Mandatory
              </span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded",
                  run.setupPassed
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-zinc-800 text-zinc-600"
                )}
              >
                Setup
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Signal trace */}
      {run?.trace && run.trace.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
            Signals
          </p>
          <div className="space-y-1">
            {run.trace.slice(0, 8).map((l, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={l.passed ? "text-emerald-400" : "text-zinc-600"}>
                  {l.passed ? "✓" : "✗"}
                </span>
                <span className="text-zinc-400 truncate">
                  {l.layer.replace(/_/g, " ")}
                </span>
                {l.contribution > 0 && (
                  <span className="ml-auto text-emerald-400/70">
                    +{l.contribution}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open position */}
      {pos && (
        <div className="rounded-lg border border-emerald-800/30 bg-emerald-950/20 p-4">
          <p className="text-xs font-medium text-emerald-500 uppercase tracking-wider mb-2">
            Open Position
          </p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Entry</span>
              <span className="font-mono text-zinc-200">
                ${parseFloat(pos.avgEntry).toFixed(2)}
              </span>
            </div>
            {pos.sl && (
              <div className="flex justify-between">
                <span className="text-zinc-500">SL</span>
                <span className="font-mono text-rose-400">
                  ${parseFloat(pos.sl).toFixed(2)}
                </span>
              </div>
            )}
            {pos.tp && (
              <div className="flex justify-between">
                <span className="text-zinc-500">TP</span>
                <span className="font-mono text-emerald-400">
                  ${parseFloat(pos.tp).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
