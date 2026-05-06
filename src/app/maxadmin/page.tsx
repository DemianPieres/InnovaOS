import { connectDB } from "@/lib/mongodb";
import { Tenant } from "@/models/Tenant";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import { MaxAdminShell } from "@/components/maxadmin/MaxAdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

/**
 * Dashboard principal del MAXADMIN: muestra resumen de tenants y actividad.
 */
export default async function MaxAdminDashboardPage() {
  await connectDB();
  const [totalTenants, activeTenants, totalUsers, totalOrders] = await Promise.all([
    Tenant.countDocuments(),
    Tenant.countDocuments({ active: true }),
    User.countDocuments(),
    Order.countDocuments(),
  ]);

  const stats = [
    { label: "Tenants totales", value: totalTenants },
    { label: "Tenants activos", value: activeTenants },
    { label: "Usuarios", value: totalUsers },
    { label: "Pedidos", value: totalOrders },
  ];

  return (
    <MaxAdminShell>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Resumen general</h1>
          <p className="text-muted-foreground mt-1">
            Vista global de la plataforma InnovaOS.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Próximos pasos</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                Crear un tenant en{" "}
                <span className="font-mono text-foreground">/maxadmin/tenants</span>.
              </li>
              <li>Asignar un usuario admin para el tenant.</li>
              <li>Compartir credenciales con el cliente final.</li>
              <li>El cliente entra a /login con su slug y empieza a operar.</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </MaxAdminShell>
  );
}
