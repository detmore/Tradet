"use client";

import { useEffect, useRef } from "react";

export type SseEvent = { type: string; [key: string]: unknown };

// All SSE event names emitted by /api/stream
const SSE_EVENT_NAMES = [
  "trade_event",
  "equity_event",
  "alert_event",
  "settings_event",
  "connected",
] as const;

export function useSse(onEvent: (event: SseEvent) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let es: EventSource;
    let closed = false;

    function connect() {
      if (closed) return;
      es = new EventSource("/api/stream");

      // Attach listeners for every known SSE event type
      for (const eventName of SSE_EVENT_NAMES) {
        es.addEventListener(eventName, (e) => {
          try {
            const raw = JSON.parse((e as MessageEvent).data) as Record<string, unknown>;
            // Inject a normalised `type` field so consumers can branch on it
            const normalised: SseEvent = { type: eventName, ...raw };
            onEventRef.current(normalised);
          } catch {
            // ignore malformed events
          }
        });
      }

      es.onerror = () => {
        // EventSource will auto-reconnect on transient errors.
        // If it reaches CLOSED state, reconnect manually.
        if (es.readyState === EventSource.CLOSED && !closed) {
          setTimeout(connect, 3_000);
        }
      };
    }

    connect();

    return () => {
      closed = true;
      es?.close();
    };
  }, []);
}
