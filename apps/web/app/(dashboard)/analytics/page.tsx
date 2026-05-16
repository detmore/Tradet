import { Topbar } from "@/components/shell/topbar";
import { AnalyticsContent } from "@/components/analytics/analytics-content";

export default function AnalyticsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Topbar title="Analytics" />
      <div style={{ flex: 1, overflow: "auto", background: "var(--bg)" }}>
        <AnalyticsContent />
      </div>
    </div>
  );
}
