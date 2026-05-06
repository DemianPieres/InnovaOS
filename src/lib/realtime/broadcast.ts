type Subscriber = (event: TenantEvent) => void;

export interface TenantEvent {
  type: string;
  [key: string]: unknown;
}

interface GlobalRealtime {
  subscribers: Map<string, Set<Subscriber>>;
}

declare global {
  // eslint-disable-next-line no-var
  var _innovaosRealtime: GlobalRealtime | undefined;
}

const realtime: GlobalRealtime =
  global._innovaosRealtime ?? { subscribers: new Map() };
if (!global._innovaosRealtime) {
  global._innovaosRealtime = realtime;
}

/**
 * Suscribe un callback a eventos de un tenant. Devuelve función para desuscribir.
 */
export function subscribeTenantEvents(
  tenantId: string,
  fn: Subscriber
): () => void {
  let set = realtime.subscribers.get(tenantId);
  if (!set) {
    set = new Set();
    realtime.subscribers.set(tenantId, set);
  }
  set.add(fn);
  return () => {
    set?.delete(fn);
    if (set && set.size === 0) {
      realtime.subscribers.delete(tenantId);
    }
  };
}

/**
 * Emite un evento a todos los suscriptores de un tenant.
 */
export function broadcastTenantEvent(
  tenantId: string,
  event: TenantEvent
): void {
  const set = realtime.subscribers.get(tenantId);
  if (!set || set.size === 0) return;
  for (const fn of set) {
    try {
      fn(event);
    } catch {
      /* tolerar errores en suscriptores */
    }
  }
}
