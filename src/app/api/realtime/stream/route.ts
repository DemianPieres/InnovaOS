import { NextRequest } from "next/server";
import { requireSystemAuth } from "@/lib/auth/guard";
import { subscribeTenantEvents } from "@/lib/realtime/broadcast";
import { errorResponse } from "@/lib/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-Sent Events: stream de eventos del tenant del usuario autenticado.
 * Cada cliente recibe SOLO eventos de su tenant (filtro garantizado).
 */
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireSystemAuth(req);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const send = (data: object) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        send({ type: "connected", tenantId: tenantId.toString() });

        const unsubscribe = subscribeTenantEvents(tenantId.toString(), (event) => {
          send(event);
        });

        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": ping\n\n"));
          } catch {
            clearInterval(heartbeat);
          }
        }, 25_000);

        const abort = () => {
          clearInterval(heartbeat);
          unsubscribe();
          try {
            controller.close();
          } catch {
            /* noop */
          }
        };
        req.signal.addEventListener("abort", abort);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
