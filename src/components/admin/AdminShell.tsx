"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tag,
  Grid3x3,
  ClipboardList,
  Wallet,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChefHat,
  Menu as MenuIcon,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SessionInfo {
  user: { name: string; email: string; role: string };
  tenant: { name: string; slug: string; primaryColor: string };
}

const navItems = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Pedidos", icon: ClipboardList },
  { href: "/admin/products", label: "Productos", icon: Package },
  { href: "/admin/categories", label: "Categorías", icon: Tag },
  { href: "/admin/tables", label: "Mesas", icon: Grid3x3 },
  { href: "/admin/cash", label: "Caja", icon: Wallet },
  { href: "/admin/customers", label: "Clientes", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
];

const operationsItems = [
  { href: "/operations/kitchen", label: "Cocina", icon: ChefHat },
  { href: "/operations/bar", label: "Barra", icon: ChefHat },
  { href: "/operations/waiter", label: "Mozo", icon: ChefHat },
];

/**
 * Layout principal del panel admin con navegación lateral.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  /**
   * Carga la sesión actual del usuario.
   */
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.user && d.tenant) setSession(d);
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  /**
   * Hace logout y redirige al login.
   */
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] min-h-screen">
      <aside
        className={cn(
          "border-r bg-card flex flex-col fixed md:static inset-y-0 left-0 z-40 w-64 transform transition-transform md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <p className="font-semibold leading-tight">
              {session?.tenant.name || "InnovaOS"}
            </p>
            <p className="text-xs text-muted-foreground">
              {session?.user.role || ""}
            </p>
          </div>
          <button
            type="button"
            className="md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t">
            <p className="text-xs uppercase tracking-wider text-muted-foreground px-3 mb-2">
              Operaciones
            </p>
            {operationsItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="p-3 border-t">
          <div className="px-3 py-2 text-sm">
            <p className="font-medium truncate">{session?.user.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {session?.user.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <div className="flex flex-col min-h-screen md:ml-0">
        <header className="md:hidden border-b p-4 flex items-center justify-between bg-card">
          <button type="button" onClick={() => setMobileOpen(true)}>
            <MenuIcon className="w-5 h-5" />
          </button>
          <p className="font-semibold">{session?.tenant.name}</p>
          <div className="w-5" />
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
