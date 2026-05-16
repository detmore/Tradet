export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export function formatCurrency(value: string | number, decimals = 2): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatPnl(value: string | number): { text: string; positive: boolean } {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(n)) return { text: "—", positive: true };
  const text = (n >= 0 ? "+" : "") + formatCurrency(n);
  return { text, positive: n >= 0 };
}

export const TZ = "Europe/Istanbul";

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString("tr-TR", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: TZ,
  });
}

export function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
