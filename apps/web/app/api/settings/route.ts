import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { botSettings, strategyConfigs } from "@trade/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [settings] = await db.select().from(botSettings).limit(1);
    const [config] = await db.select().from(strategyConfigs)
      .where(eq(strategyConfigs.enabled, true)).limit(1);
    return NextResponse.json({ settings: settings ?? null, config: config ?? null });
  } catch {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}
