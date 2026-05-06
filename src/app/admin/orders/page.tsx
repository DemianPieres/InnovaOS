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
import { formatCurrency, formatDate } from "@/lib/utils";
import { useTenantStream } from "@/hooks/useTenantStream";
import { PaymentDialog } from "@/components/admin/PaymentDialog";

interface OrderItem {
  _id?: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  station: string;
  status: string;
}

interface Order {
  _id: string;
  tableNumber?: number;
  customerName?: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  status: string;
  createdAt: string;
  notes?: string;
}

const statusFlow: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready"],
  ready: ["served"],
  served: ["paid"],
};

const statusColor: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  pending: "warning",
  confirmed: "default",
  preparing: "default",
  ready: "success",
  served: "secondary",
  paid: "success",
  cancelled: "destructive",
};

/**
 * Página de pedidos para admin/manager con actualización en tiempo real.
 */
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("active");
  const [payOrder, setPayOrder] = useState<Order | null>(null);

  /**
   * Carga pedidos según el filtro elegido.
   */
  async function load() {
    setLoading(true);
    try {
      let statusQuery = "";
      if (filter === "active") {
        statusQuery = "pending,confirmed,preparing,ready,served";
      } else if (filter !== "all") {
        statusQuery = filter;
      }
      const url = statusQuery
        ? `/api/orders?status=${statusQuery}`
        : "/api/orders";
      const res = await fetch(url);
      const data = await res.json();
      setOrders(data.orders || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  useTenantStream((event) => {
    if (event.type === "order:new" || event.type === "order:update") {
      load();
    }
  });

  /**
   * Cambia el estado de un pedido al siguiente del flujo.
   */
  async function changeStatus(id: string, newStatus: string) {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await load();
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground mt-1">
            Actualización en vivo desde la cocina y la carta del cliente.
          </p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {[
            { v: "active", l: "Activos" },
            { v: "pending", l: "Pendientes" },
            { v: "preparing", l: "En preparación" },
            { v: "ready", l: "Listos" },
            { v: "paid", l: "Pagados" },
            { v: "all", l: "Todos" },
          ].map((f) => (
            <Button
              key={f.v}
              size="sm"
              variant={filter === f.v ? "default" : "outline"}
              onClick={() => setFilter(f.v)}
            >
              {f.l}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay pedidos en este filtro.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.map((o) => (
            <Card key={o._id} className="overflow-hidden">
              <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">
                    {o.tableNumber ? `Mesa ${o.tableNumber}` : "Mostrador"}
                    {o.customerName && (
                      <span className="text-muted-foreground font-normal ml-2 text-sm">
                        · {o.customerName}
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(o.createdAt)}
                  </p>
                </div>
                <Badge variant={statusColor[o.status] || "secondary"}>
                  {o.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1 text-sm">
                  {o.items.map((it, idx) => (
                    <li
                      key={it._id || idx}
                      className="flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <span className="font-medium">{it.quantity}× </span>
                        {it.name}
                        {it.notes && (
                          <span className="block text-xs text-muted-foreground">
                            ↳ {it.notes}
                          </span>
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        {formatCurrency(it.price * it.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
                {o.notes && (
                  <p className="text-xs text-muted-foreground border-t pt-2">
                    {o.notes}
                  </p>
                )}
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold">{formatCurrency(o.total)}</span>
                </div>
                <div className="flex gap-2 pt-1 flex-wrap">
                  {statusFlow[o.status]?.map((next) => (
                    <Button
                      key={next}
                      size="sm"
                      variant={next === "cancelled" ? "destructive" : "default"}
                      onClick={() => changeStatus(o._id, next)}
                    >
                      Marcar {next}
                    </Button>
                  ))}
                  {o.status !== "paid" && o.status !== "cancelled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPayOrder(o)}
                    >
                      Cobrar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {payOrder && (
        <PaymentDialog
          orderId={payOrder._id}
          total={payOrder.total}
          onClose={() => setPayOrder(null)}
          onSuccess={() => {
            setPayOrder(null);
            load();
          }}
        />
      )}
    </div>
  );
}
