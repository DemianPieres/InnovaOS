"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface SalesByDay {
  _id: string;
  total: number;
  orders: number;
}
interface TopProduct {
  _id: string;
  name: string;
  quantity: number;
  revenue: number;
}
interface PaymentMix {
  _id: string;
  total: number;
  count: number;
}

/**
 * Página de analytics: ventas por día, top productos, mix de métodos de pago.
 */
export default function AnalyticsPage() {
  const [salesByDay, setSalesByDay] = useState<SalesByDay[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [paymentMix, setPaymentMix] = useState<PaymentMix[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/sales?days=30")
      .then((r) => r.json())
      .then((d) => {
        setSalesByDay(d.salesByDay || []);
        setTopProducts(d.topProducts || []);
        setPaymentMix(d.paymentMix || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalSales = salesByDay.reduce((acc, d) => acc + d.total, 0);
  const totalOrders = salesByDay.reduce((acc, d) => acc + d.orders, 0);
  const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
  const maxDay = Math.max(...salesByDay.map((d) => d.total), 1);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">Últimos 30 días.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ventas totales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatCurrency(totalSales)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalOrders} pedidos
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ticket promedio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatCurrency(avgTicket)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Días con ventas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{salesByDay.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ventas por día</CardTitle>
            </CardHeader>
            <CardContent>
              {salesByDay.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Sin datos suficientes todavía.
                </p>
              ) : (
                <div className="space-y-2">
                  {salesByDay.map((d) => (
                    <div key={d._id} className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-xs w-24 text-muted-foreground">
                        {d._id}
                      </span>
                      <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${(d.total / maxDay) * 100}%` }}
                        />
                      </div>
                      <span className="w-28 text-right font-medium">
                        {formatCurrency(d.total)}
                      </span>
                      <span className="w-12 text-right text-xs text-muted-foreground">
                        {d.orders}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top productos</CardTitle>
              </CardHeader>
              <CardContent>
                {topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Sin datos.
                  </p>
                ) : (
                  <ol className="space-y-2 text-sm">
                    {topProducts.map((p, idx) => (
                      <li
                        key={p._id}
                        className="flex items-center justify-between border-b pb-2 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground w-6">
                            {idx + 1}.
                          </span>
                          <span className="font-medium">{p.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(p.revenue)}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.quantity} u.
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Métodos de pago</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentMix.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Sin pagos registrados.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {paymentMix.map((p) => (
                      <div
                        key={p._id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="font-medium capitalize">{p._id}</span>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(p.total)}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.count} pagos
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
