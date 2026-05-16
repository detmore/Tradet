import { Topbar } from "@/components/shell/topbar";
import { PortfolioContent } from "@/components/portfolio/portfolio-content";

export default function PortfolioPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Topbar title="Portfolio" />
      <div style={{ flex: 1, overflow: "auto", background: "var(--bg)" }}>
        <PortfolioContent />
      </div>
    </div>
  );
}
