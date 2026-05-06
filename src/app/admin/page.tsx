"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface Stats {
  totalToday: number;
  ordersToday: number;
  pendingOrders: number;
  occupiedTables: number;
  totalTables: number;
  totalProducts: number;
  totalCustomers: number;
}

/**
 * Dashboard del admin: muestra resumen del día y accesos rápidos.
 */
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/summary")
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Resumen</h1>
        <p className="text-muted-foreground mt-1">Actividad del día.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">
                Ventas hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {formatCurrency(stats.totalToday)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.ordersToday} pedidos
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">
                Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.pendingOrders}</p>
              <p className="text-xs text-muted-foreground mt-1">por preparar</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">
                Mesas ocupadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {stats.occupiedTables}/{stats.totalTables}
              </p>
              <p className="text-xs text-muted-foreground mt-1">en uso</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">
                Catálogo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalProducts}</p>
              <p className="text-xs text-muted-foreground mt-1">productos</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Empezá rápido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>1. Cargá tus categorías y productos en <span className="font-mono">Productos</span>.</p>
          <p>2. Generá el QR de tus mesas en <span className="font-mono">Mesas</span>.</p>
          <p>3. Aprí caja al iniciar el turno.</p>
          <p>4. Compartí la URL pública del menú: <span className="font-mono">/menu/[slug]</span>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
