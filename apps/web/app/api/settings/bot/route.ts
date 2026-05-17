import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { botSettings, alerts } from "@trade/db";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import postgres from "postgres";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const allowed = ["mode", "paperStartingBalance", "accountCurrency", "isRunning", "killSwitchActive"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }
    // Validate critical fields
    if ("mode" in updates && updates["mode"] !== "paper" && updates["mode"] !== "live") {
      return NextResponse.json({ error: "Invalid mode value" }, { status: 400 });
    }
    if ("killSwitchActive" in updates && typeof updates["killSwitchActive"] !== "boolean") {
      return NextResponse.json({ error: "killSwitchActive must be a boolean" }, { status: 400 });
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }
    await db.update(botSettings).set({ ...updates, updatedAt: new Date() }).where(eq(botSettings.id, 1));

    // Audit log for critical setting changes
    if ("mode" in updates || "killSwitchActive" in updates) {
      const changeDesc = Object.entries(updates)
        .filter(([k]) => k === "mode" || k === "killSwitchActive")
        .map(([k, v]) => `${k}=${String(v)}`)
        .join(", ");
      await db.insert(alerts).values({
        severity: "info",
        category: "settings_changed",
        title: "Settings Changed",
        body: `Critical setting updated: ${changeDesc}`,
        channel: "internal",
        deliveryStatus: "sent",
      });
    }

    // Notify SSE clients so sidebar/topbar update immediately
    try {
      const sql = postgres(process.env["DATABASE_URL"] ?? "", { max: 1 });
      await sql.notify("settings_events", JSON.stringify({ type: "settings_changed", ...updates }));
      await sql.end();
    } catch { /* non-critical, don't fail the request */ }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
