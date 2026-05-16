import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Binance symbol format: BTC/USDT → BTCUSDT
function toBinanceSymbol(s: string) {
  return s.replace("/", "").replace("-", "");
}

const INTERVAL_MAP: Record<string, string> = {
  "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
  "1h": "1h", "4h": "4h", "1d": "1d",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol    = searchParams.get("symbol")    ?? "BTC/USDT";
  const timeframe = searchParams.get("timeframe") ?? "15m";
  const limit     = Math.min(parseInt(searchParams.get("limit") ?? "300", 10), 1000);

  const interval = INTERVAL_MAP[timeframe] ?? "15m";
  const binanceSym = toBinanceSymbol(symbol);

  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSym}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Binance ${res.status}`);

    const raw = await res.json() as number[][];

    const candles = raw.map((bar) => ({
      time: Math.floor(bar[0]! / 1000) as number,
      open:   parseFloat(String(bar[1])),
      high:   parseFloat(String(bar[2])),
      low:    parseFloat(String(bar[3])),
      close:  parseFloat(String(bar[4])),
      volume: parseFloat(String(bar[5])),
    }));

    return NextResponse.json({ candles, symbol, timeframe });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), candles: [] },
      { status: 502 }
    );
  }
}
