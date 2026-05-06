"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Shield, Users, Building2, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/maxadmin", label: "Resumen", icon: LayoutDashboard },
  { href: "/maxadmin/tenants", label: "Tenants", icon: Building2 },
  { href: "/maxadmin/users", label: "Usuarios", icon: Users },
];

/**
 * Shell del panel MAXADMIN con sidebar y header.
 */
export function MaxAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  /**
   * Hace logout del MAXADMIN y redirige al login.
   */
  async function handleLogout() {
    await fetch("/maxadmin/api/auth/logout", { method: "POST" });
    router.push("/maxadmin/login");
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] min-h-screen">
      <aside className="border-r bg-card flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold">MAXADMIN</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">InnovaOS</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/maxadmin"
                ? pathname === "/maxadmin"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
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
        </nav>
        <div className="p-4 border-t">
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
      <main className="overflow-y-auto">{children}</main>
    </div>
  );
}
