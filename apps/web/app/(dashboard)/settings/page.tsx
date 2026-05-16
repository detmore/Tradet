import { Topbar } from "@/components/shell/topbar";
import { SettingsContent } from "@/components/settings/settings-content";

export default function SettingsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Topbar title="Settings" />
      <div style={{ flex: 1, overflow: "hidden" }}>
        <SettingsContent />
      </div>
    </div>
  );
}
