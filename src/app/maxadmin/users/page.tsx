"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, UserCog } from "lucide-react";
import { MaxAdminShell } from "@/components/maxadmin/MaxAdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UserRow {
  _id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: string;
}

interface TenantRow {
  _id: string;
  name: string;
  slug: string;
}

const roles = [
  { value: "admin", label: "Administrador" },
  { value: "manager", label: "Encargado" },
  { value: "cashier", label: "Cajero" },
  { value: "waiter", label: "Mozo" },
  { value: "kitchen", label: "Cocina" },
  { value: "bar", label: "Barra" },
];

function UsersContent() {
  const searchParams = useSearchParams();
  const initialTenantId = searchParams.get("tenantId") || "";

  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [tenantId, setTenantId] = useState(initialTenantId);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    role: "admin",
  });

  /**
   * Carga la lista de tenants disponibles para seleccionar.
   */
  useEffect(() => {
    fetch("/maxadmin/api/tenants")
      .then((r) => r.json())
      .then((d) => setTenants(d.tenants || []));
  }, []);

  /**
   * Carga usuarios del tenant seleccionado.
   */
  async function loadUsers(id: string) {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/maxadmin/api/users?tenantId=${id}`);
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tenantId) loadUsers(tenantId);
  }, [tenantId]);

  /**
   * Crea un nuevo usuario para el tenant elegido.
   */
  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId) {
      setError("Elegí un tenant primero.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/maxadmin/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tenantId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear el usuario.");
        return;
      }
      setShowForm(false);
      setForm({ email: "", name: "", password: "", role: "admin" });
      await loadUsers(tenantId);
    } finally {
      setCreating(false);
    }
  }

  return (
    <MaxAdminShell>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Usuarios</h1>
            <p className="text-muted-foreground mt-1">
              Gestioná los usuarios de cada local.
            </p>
          </div>
          <Button onClick={() => setShowForm((v) => !v)} disabled={!tenantId}>
            <Plus className="w-4 h-4 mr-2" />
            {showForm ? "Cancelar" : "Nuevo usuario"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tenant</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">Seleccioná un tenant…</option>
              {tenants.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} (/{t.slug})
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {showForm && tenantId && (
          <Card>
            <CardHeader>
              <CardTitle>Crear usuario</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleCreate}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Mín 8 chars, mayús + minús + dígito"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <select
                    id="role"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    {roles.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                {error && (
                  <div className="md:col-span-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}
                <div className="md:col-span-2">
                  <Button type="submit" disabled={creating}>
                    {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Crear usuario
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Usuarios del tenant</CardTitle>
          </CardHeader>
          <CardContent>
            {!tenantId ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Elegí un tenant para ver sus usuarios.
              </p>
            ) : loading ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sin usuarios todavía.
              </p>
            ) : (
              <div className="divide-y">
                {users.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCog className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{user.role}</Badge>
                      <Badge variant={user.active ? "success" : "secondary"}>
                        {user.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MaxAdminShell>
  );
}

/**
 * Página de gestión de usuarios desde MAXADMIN.
 */
export default function MaxAdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-muted-foreground text-sm">Cargando…</div>
      }
    >
      <UsersContent />
    </Suspense>
  );
}
