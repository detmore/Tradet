import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  prefix?: string;
  showSign?: boolean;
  subtext?: string;
  className?: string;
}

export function KpiCard({ label, value, prefix = "", showSign = false, subtext, className }: KpiCardProps) {
  const num = parseFloat(value);
  const isPos = showSign && num > 0;
  const isNeg = showSign && num < 0;

  const numColor = isPos ? "var(--positive)" : isNeg ? "var(--negative)" : "var(--text-1)";
  const formatted = isNaN(num) ? "—" : Math.abs(num).toLocaleString("en-US", {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });

  return (
    <div
      className={cn("relative p-4 flex flex-col gap-1", className)}
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      {/* Amber corner accent */}
      <span
        className="absolute top-0 left-0 w-6 h-px"
        style={{ background: "var(--accent)" }}
      />
      <span
        className="absolute top-0 left-0 w-px h-6"
        style={{ background: "var(--accent)" }}
      />

      <span
        className="font-ui text-xs font-semibold tracking-widest uppercase"
        style={{ color: "var(--text-3)", letterSpacing: "0.12em" }}
      >
        {label}
      </span>

      <div className="flex items-baseline gap-1 mt-1">
        {prefix && (
          <span className="font-ui text-base font-medium" style={{ color: "var(--text-2)" }}>
            {prefix}
          </span>
        )}
        {showSign && num > 0 && (
          <span className="font-display text-3xl" style={{ color: numColor }}>+</span>
        )}
        {showSign && num < 0 && (
          <span className="font-display text-3xl" style={{ color: numColor }}>-</span>
        )}
        <span
          className="font-display text-3xl leading-none"
          style={{ color: numColor }}
        >
          {formatted}
        </span>
      </div>

      {subtext && (
        <span className="font-ui text-xs" style={{ color: "var(--text-3)" }}>
          {subtext}
        </span>
      )}
    </div>
  );
}
