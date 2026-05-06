"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { useTenantStream } from "@/hooks/useTenantStream";

interface OrderItem {
  _id?: string;
  productId: string;
  name: string;
  quantity: number;
  notes?: string;
  station: string;
  status: string;
}

interface Order {
  _id: string;
  tableNumber?: number;
  items: OrderItem[];
  status: string;
  createdAt: string;
  notes?: string;
}

interface StationBoardProps {
  station: "kitchen" | "bar";
  title: string;
  description: string;
}

const itemFlow: Record<string, string> = {
  pending: "preparing",
  preparing: "ready",
  ready: "served",
};

const itemFlowLabel: Record<string, string> = {
  pending: "Empezar",
  preparing: "Marcar listo",
  ready: "Marcar entregado",
};

/**
 * Tablero operativo de cocina/barra. Muestra solo items de la estación.
 * Cada cocinero/bartender avanza el estado de los items, no del pedido entero.
 */
export function StationBoard({ station, title, description }: StationBoardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Carga pedidos activos con items de la estación.
   */
  async function load() {
    try {
      const res = await fetch(
        `/api/orders?status=pending,confirmed,preparing,ready&station=${station}`
      );
      const data = await res.json();
      setOrders(data.orders || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [station]);

  useTenantStream((event) => {
    if (event.type === "order:new" || event.type === "order:update") {
      load();
    }
  });

  /**
   * Avanza el estado de un ítem (pending → preparing → ready → served).
   */
  async function advanceItem(orderId: string, itemId: string, current: string) {
    const next = itemFlow[current];
    if (!next) return;
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemUpdate: { itemId, status: next },
      }),
    });
    await load();
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders
            .map((order) => ({
              order,
              items: order.items.filter(
                (it) =>
                  it.station === station &&
                  it.status !== "served" &&
                  it.status !== "cancelled"
              ),
            }))
            .filter(({ items }) => items.length > 0)
            .map(({ order, items }) => (
              <Card key={order._id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {order.tableNumber
                        ? `Mesa ${order.tableNumber}`
                        : "Mostrador"}
                    </CardTitle>
                    <Badge variant="outline">{order.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((it) => (
                    <div
                      key={it._id}
                      className="rounded-md border p-3 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium leading-tight">
                          <span className="text-primary mr-1">{it.quantity}×</span>
                          {it.name}
                        </p>
                        {it.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ↳ {it.notes}
                          </p>
                        )}
                        <Badge
                          variant="secondary"
                          className="mt-2 text-[10px] uppercase"
                        >
                          {it.status}
                        </Badge>
                      </div>
                      {itemFlow[it.status] && (
                        <Button
                          size="sm"
                          onClick={() =>
                            advanceItem(order._id, it._id || "", it.status)
                          }
                        >
                          {itemFlowLabel[it.status]}
                        </Button>
                      )}
                    </div>
                  ))}
                  {order.notes && (
                    <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                      Nota: {order.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
