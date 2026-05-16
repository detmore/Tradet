import { Topbar } from "@/components/shell/topbar";
import { TradesTable } from "@/components/trades/trades-table";

export default function TradesPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Topbar title="Trades" />
      <div style={{ flex: 1, overflow: "auto", background: "var(--bg)" }}>
        <TradesTable />
      </div>
    </div>
  );
}
