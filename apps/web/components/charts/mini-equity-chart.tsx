"use client";

import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, YAxis } from "recharts";

interface DataPoint { takenAt: string | Date; totalBalance: string }
interface Props { data: DataPoint[]; height?: number }

export function MiniEquityChart({ data, height = 120 }: Props) {
  if (data.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.10em", color: "var(--text-3)", textTransform: "uppercase" }}>
        No equity data yet
      </div>
    );
  }

  const chartData = data.map(d => ({
    value: parseFloat(d.totalBalance),
    time: new Date(d.takenAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false }),
  }));

  const first = chartData[0]?.value ?? 0;
  const last  = chartData[chartData.length - 1]?.value ?? 0;
  const isUp  = last >= first;
  const stroke = isUp ? "var(--positive)" : "var(--negative)";
  const strokeHex = isUp ? "#00e676" : "#ff3b3b";

  const values = chartData.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const pad = (maxVal - minVal) * 0.1 || 1;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={strokeHex} stopOpacity={0.18} />
            <stop offset="100%" stopColor={strokeHex} stopOpacity={0}    />
          </linearGradient>
        </defs>
        <XAxis dataKey="time" hide />
        <YAxis domain={[minVal - pad, maxVal + pad]} hide />
        <Tooltip
          contentStyle={{
            background: "#13131a",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 0,
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
          }}
          labelStyle={{ color: "#666", fontSize: 10, letterSpacing: "0.06em" }}
          itemStyle={{ color: strokeHex }}
          formatter={(v: number) => [`$${v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Balance"]}
          cursor={{ stroke: "rgba(240,165,0,0.3)", strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={1.5}
          fill="url(#eqGrad)"
          dot={false}
          activeDot={{ r: 3, fill: strokeHex, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
