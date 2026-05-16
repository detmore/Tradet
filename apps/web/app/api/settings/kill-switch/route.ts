import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { botSettings, alerts } from "@trade/db";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Rate limit: max 3 kill switch activations per minute per IP
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`kill-switch:${ip}`, 3, 60_000)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await req.json() as { active: boolean };
    await db.update(botSettings).set({
      killSwitchActive: body.active,
      updatedAt: new Date(),
    }).where(eq(botSettings.id, 1));

    await db.insert(alerts).values({
      severity: body.active ? "critical" : "warning",
      category: "kill_switch",
      title: body.active ? "Kill Switch Activated" : "Kill Switch Deactivated",
      body: body.active ? "All trading halted via kill switch." : "Kill switch deactivated.",
      channel: "internal",
      deliveryStatus: "sent",
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
