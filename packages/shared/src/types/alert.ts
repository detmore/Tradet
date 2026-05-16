import type { AlertSeverity, AlertCategory } from "../enums";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  sentAt: Date;
  channel: string;
  deliveryStatus: "pending" | "sent" | "failed";
}
