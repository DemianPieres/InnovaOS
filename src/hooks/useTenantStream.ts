"use client";

import { useEffect, useRef } from "react";

type EventCallback = (data: Record<string, unknown>) => void;

/**
 * Hook que se conecta al stream SSE del tenant y dispara callbacks por cada evento.
 */
export function useTenantStream(onEvent: EventCallback): void {
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    const evt = new EventSource("/api/realtime/stream");
    evt.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        cbRef.current(data);
      } catch {
        /* ignorar JSON inválido */
      }
    };
    evt.onerror = () => {
      evt.close();
    };
    return () => {
      evt.close();
    };
  }, []);
}
