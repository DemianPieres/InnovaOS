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

interface OrderItem {
  _id?: string;
  name: string;
  quantity: number;
  station: string;
  status: string;
}

interface Order {
  _id: string;
  tableNumber?: number;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt: string;
}

const tableStatusColor: Record<string, "success" | "warning" | "secondary" | "destructive" | "default"> = {
  free: "success",
  occupied: "warning",
  billing: "default",
  reserved: "secondary",
  disabled: "destructive",
};

interface TableRow {
  _id: string;
  number: number;
  status: string;
  label?: string;
}

/**
 * Vista del mozo: estado de mesas y pedidos listos para servir.
 */
export default function WaiterPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Carga pedidos activos y mesas en paralelo.
   */
  async function load() {
    try {
      const [oRes, tRes] = await Promise.all([
        fetch("/api/orders?status=pending,confirmed,preparing,ready,served"),
        fetch("/api/tables"),
      ]);
      const [o, t] = await Promise.all([oRes.json(), tRes.json()]);
      setOrders(o.orders || []);
      setTables(t.tables || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useTenantStream((event) => {
    if (event.type === "order:new" || event.type === "order:update") {
      load();
    }
  });

  /**
   * Marca un pedido como servido completo (transición rápida desde mozo).
   */
  async function markAllServed(orderId: string) {
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "served" }),
    });
    await load();
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mozos</h1>
        <p className="text-muted-foreground mt-1">
          Tablero del salón con mesas y pedidos.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Mesas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {tables.map((t) => (
                  <div
                    key={t._id}
                    className="rounded-lg border p-3 text-center"
                  >
                    <p className="font-bold text-lg">{t.number}</p>
                    <Badge
                      variant={tableStatusColor[t.status] || "secondary"}
                      className="mt-1"
                    >
                      {t.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-xl font-semibold mb-3">Pedidos del salón</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.map((o) => {
                const allReady = o.items.every(
                  (it) =>
                    it.status === "ready" ||
                    it.status === "served" ||
                    it.status === "cancelled"
                );
                return (
                  <Card key={o._id} className={allReady ? "border-emerald-500/40" : ""}>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {o.tableNumber ? `Mesa ${o.tableNumber}` : "Mostrador"}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(o.createdAt)}
                        </p>
                      </div>
                      <Badge variant={allReady ? "success" : "default"}>
                        {allReady ? "Para servir" : o.status}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <ul className="text-sm">
                        {o.items.map((it, idx) => (
                          <li
                            key={it._id || idx}
                            className="flex justify-between"
                          >
                            <span>
                              {it.quantity}× {it.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {it.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between border-t pt-2">
                        <span className="text-sm font-medium">
                          {formatCurrency(o.total)}
                        </span>
                        {o.status !== "served" && o.status !== "paid" && (
                          <Button
                            size="sm"
                            onClick={() => markAllServed(o._id)}
                          >
                            Servido
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {orders.length === 0 && (
                <Card className="md:col-span-2">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Sin pedidos activos.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
