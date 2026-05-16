import { formatDate } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  severity: string;
  category: string;
  title: string;
  sentAt: string | Date;
}

interface RecentAlertsProps {
  alerts: Alert[];
}

export function RecentAlerts({ alerts }: RecentAlertsProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
        Recent Alerts
      </p>
      {alerts.length === 0 ? (
        <p className="text-sm text-zinc-600">No alerts yet.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-start gap-3 text-sm">
              <span
                className={cn(
                  "mt-0.5 h-1.5 w-1.5 rounded-full shrink-0",
                  a.severity === "error" || a.severity === "critical"
                    ? "bg-rose-400"
                    : a.severity === "warning"
                    ? "bg-amber-400"
                    : "bg-zinc-500"
                )}
              />
              <span className="flex-1 text-zinc-300">{a.title}</span>
              <span className="text-zinc-600 shrink-0">{formatDate(a.sentAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
