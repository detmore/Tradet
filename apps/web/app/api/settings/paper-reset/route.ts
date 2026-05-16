import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { botSettings, positions, trades, orders, equitySnapshots, alerts } from "@trade/db";
import { eq, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const TRADE_ALERT_CATEGORIES = ["trade_opened", "trade_closed", "sl_hit", "tp_hit", "daily_loss_limit", "kill_switch"] as const;

export async function POST() {
  try {
    const [current] = await db.select().from(botSettings).limit(1);
    if (!current) return NextResponse.json({ error: "No settings found" }, { status: 404 });

    const startingBalance = current.paperStartingBalance;

    // Bakiyeyi başlangıca döndür
    await db.update(botSettings).set({
      paperCurrentBalance: startingBalance,
      updatedAt: new Date(),
    }).where(eq(botSettings.id, 1));

    // Kağıt modundaki tüm işlem verilerini sil
    await db.delete(trades).where(eq(trades.mode, "paper"));
    await db.delete(positions).where(eq(positions.mode, "paper"));
    await db.delete(orders).where(eq(orders.mode, "paper"));
    await db.delete(equitySnapshots).where(eq(equitySnapshots.mode, "paper"));

    // İşlem kaynaklı uyarıları temizle (ayar değişikliği logları korunur)
    await db.delete(alerts).where(inArray(alerts.category, [...TRADE_ALERT_CATEGORIES]));

    // Başlangıç equity snapshot'ı oluştur — grafik hemen dolsun
    await db.insert(equitySnapshots).values({
      mode: "paper",
      totalBalance: startingBalance,
      availableBalance: startingBalance,
      unrealizedPnl: "0",
      realizedPnlCum: "0",
      openPositionsCount: 0,
    });

    // Bot'a anlık bildir — in-memory risk sayaçlarını temizlesin
    await db.execute(sql`SELECT pg_notify('settings_events', '{"type":"paper_reset"}')`);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
