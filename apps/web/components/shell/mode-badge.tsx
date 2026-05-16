import { cn } from "@/lib/utils";

interface ModeBadgeProps {
  mode: "paper" | "live";
  className?: string;
}

export function ModeBadge({ mode, className }: ModeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
        mode === "paper"
          ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30"
          : "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
        className
      )}
    >
      {mode}
    </span>
  );
}
