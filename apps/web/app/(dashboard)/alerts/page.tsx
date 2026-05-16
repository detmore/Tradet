import { Topbar } from "@/components/shell/topbar";
import { AlertsContent } from "@/components/alerts/alerts-content";

export default function AlertsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Topbar title="Alerts" />
      <div style={{ flex: 1, overflow: "auto", background: "var(--bg)" }}>
        <AlertsContent />
      </div>
    </div>
  );
}
