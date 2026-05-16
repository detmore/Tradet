"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  flexRender, type ColumnDef, type SortingState,
} from "@tanstack/react-table";
import { useSse } from "@/hooks/use-sse";
import { formatCurrency, formatDuration } from "@/lib/api";
import { DecisionTraceDrawer } from "./decision-trace-drawer";
import { useT } from "@/lib/i18n";

type TradeRow = {
  id: string; symbol: string; side: string; entryPrice: string;
  exitPrice: string; qty: string; realizedPnl: string;
  openedAt: string; closedAt: string; durationMs: number;
  exitReason: string; mode: string; decisionScore: string | null;
};

const RANGES = ["today", "7d", "30d", "90d", "all"] as const;
type Range = typeof RANGES[number];

const mono = (v: string) => (
  <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-2)" }}>{v}</span>
);

export function TradesTable() {
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [range, setRange] = useState<Range>("30d");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const t = useT();

  const columns: ColumnDef<TradeRow>[] = [
    {
      accessorKey: "symbol",
      header: t("table.symbol"),
      cell: i => <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-1)", letterSpacing: "0.04em" }}>{i.getValue() as string}</span>,
    },
    {
      accessorKey: "side",
      header: t("table.side"),
      cell: i => {
        const v = i.getValue() as string;
        return <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: v === "buy" ? "var(--positive)" : "var(--negative)" }}>{v.toUpperCase()}</span>;
      },
    },
    {
      accessorKey: "entryPrice",
      header: t("table.entry"),
      cell: i => mono(`$${formatCurrency(i.getValue() as string)}`),
    },
    {
      accessorKey: "exitPrice",
      header: t("table.exit"),
      cell: i => mono(`$${formatCurrency(i.getValue() as string)}`),
    },
    {
      accessorKey: "qty",
      header: t("table.qty"),
      cell: i => mono(i.getValue() as string),
    },
    {
      accessorKey: "realizedPnl",
      header: t("table.pnl"),
      cell: i => {
        const n = parseFloat(i.getValue() as string);
        const pos = n >= 0;
        return (
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: pos ? "var(--positive)" : "var(--negative)" }}>
            {pos ? "+" : "−"}${Math.abs(n).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: "exitReason",
      header: t("table.reason"),
      cell: i => <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>{i.getValue() as string}</span>,
    },
    {
      accessorKey: "durationMs",
      header: t("table.duration"),
      cell: i => <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>{formatDuration(i.getValue() as number)}</span>,
    },
    {
      accessorKey: "closedAt",
      header: t("table.closed"),
      cell: i => <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>{new Date(i.getValue() as string).toLocaleString("tr-TR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}</span>,
    },
    {
      accessorKey: "decisionScore",
      header: t("table.score"),
      cell: i => {
        const v = i.getValue() as string | null;
        return <span style={{ fontFamily: "var(--font-mono)", color: v ? "var(--accent)" : "var(--text-3)" }}>{v ? parseFloat(v).toFixed(0) : "—"}</span>;
      },
    },
  ];

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/trades?range=${range}`);
      const json = await res.json() as { trades: TradeRow[] };
      setTrades(json.trades ?? []);
    } catch { /* silent */ }
  }, [range]);

  useEffect(() => { void load(); }, [load]);
  useSse(e => { if (e["type"] === "position_closed") void load(); });

  const table = useReactTable({
    data: trades, columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div style={{ padding: "1px", display: "flex", flexDirection: "column", gap: 1, background: "rgba(255,255,255,0.06)" }}>

      {/* ── FILTER BAR ── */}
      <div style={{ background: "var(--bg-surface)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 2 }}>
        {RANGES.map(r => {
          const active = range === r;
          return (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
                padding: "5px 14px", cursor: "pointer", borderRadius: 0, border: "1px solid",
                borderColor: active ? "var(--accent-border)" : "rgba(255,255,255,0.08)",
                background: active ? "var(--accent-dim)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-3)",
                fontWeight: active ? 700 : 400, transition: "all 0.1s",
              }}
            >
              {r}
            </button>
          );
        })}
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)" }}>
          {trades.length} {t("trades.trades")}
        </span>
      </div>

      {/* ── TABLE ── */}
      <div style={{ background: "var(--bg-surface)" }}>
        {table.getRowModel().rows.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-3)", letterSpacing: "0.08em" }}>
            {t("trades.no_trades")}
          </div>
        ) : (
          <table className="bb-table" style={{ width: "100%" }}>
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => (
                    <th
                      key={h.id}
                      onClick={h.column.getToggleSortingHandler()}
                      style={{ cursor: h.column.getCanSort() ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap" }}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted() === "asc" ? " ↑" : h.column.getIsSorted() === "desc" ? " ↓" : ""}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  onClick={() => setSelectedId(row.original.id)}
                  style={{ cursor: "pointer" }}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedId && (
        <DecisionTraceDrawer tradeId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
