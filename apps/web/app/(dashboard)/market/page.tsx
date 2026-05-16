import { Topbar } from "@/components/shell/topbar";
import { MarketContent } from "@/components/market/market-content";

export default function MarketPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Topbar title="Market" />
      <div style={{ flex: 1, overflow: "hidden" }}>
        <MarketContent />
      </div>
    </div>
  );
}
