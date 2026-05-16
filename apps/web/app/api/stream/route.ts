import postgres from "postgres";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const encoder = new TextEncoder();

  let sqlClient: ReturnType<typeof postgres> | null = null;
  let closeStream!: () => void;

  const stream = new ReadableStream({
    async start(controller) {
      const sql = postgres(process.env["DATABASE_URL"] ?? "", { max: 1 });
      sqlClient = sql;

      const send = (event: string, data: unknown) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // controller may be closed if client disconnected
        }
      };

      const CHANNEL_EVENT_MAP: Record<string, string> = {
        trade_events:    "trade_event",
        equity_events:   "equity_event",
        alert_events:    "alert_event",
        settings_events: "settings_event",
      };

      const handle = (channelName: string) => (payload: string) => {
        const sseEvent = CHANNEL_EVENT_MAP[channelName] ?? "trade_event";
        try { send(sseEvent, { ...JSON.parse(payload) as object, _channel: channelName }); }
        catch { send(sseEvent, { raw: payload, _channel: channelName }); }
      };

      // Register all listeners
      try {
        await sql.listen("trade_events",    handle("trade_events"));
        await sql.listen("equity_events",   handle("equity_events"));
        await sql.listen("alert_events",    handle("alert_events"));
        await sql.listen("settings_events", handle("settings_events"));
      } catch (err) {
        console.error("SSE listener setup error:", err);
        controller.close();
        await sql.end().catch(() => undefined);
        return;
      }

      // Send initial heartbeat after listeners are up
      send("connected", { ts: Date.now() });

      // Keep stream alive until client disconnects (cancel() fires closeStream)
      const streamClosed = new Promise<void>(res => { closeStream = res; });
      await streamClosed;

      controller.close();
      await sql.end().catch(() => undefined);
      sqlClient = null;
    },
    cancel() {
      // Client disconnected — unblock start() and release the connection
      if (typeof closeStream === "function") closeStream();
      if (sqlClient) {
        sqlClient.end().catch(() => undefined);
        sqlClient = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
