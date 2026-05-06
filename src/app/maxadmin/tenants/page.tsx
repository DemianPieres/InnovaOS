"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
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

interface TenantRow {
  _id: string;
  name: string;
  slug: string;
  email: string;
  active: boolean;
  plan: string;
  createdAt: string;
}

/**
 * Página de gestión de tenants para MAXADMIN.
 */
export default function MaxAdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    email: "",
    phone: "",
    address: "",
    primaryColor: "#2563eb",
  });

  /**
   * Carga la lista de tenants desde el endpoint MAXADMIN.
   */
  async function loadTenants() {
    setLoading(true);
    try {
      const res = await fetch("/maxadmin/api/tenants");
      const data = await res.json();
      if (res.ok) setTenants(data.tenants || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTenants();
  }, []);

  /**
   * Crea un nuevo tenant a partir del formulario.
   */
  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/maxadmin/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear el tenant.");
        return;
      }
      setShowForm(false);
      setForm({
        name: "",
        slug: "",
        email: "",
        phone: "",
        address: "",
        primaryColor: "#2563eb",
      });
      await loadTenants();
    } finally {
      setCreating(false);
    }
  }

  return (
    <MaxAdminShell>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tenants</h1>
            <p className="text-muted-foreground mt-1">
              Locales registrados en la plataforma.
            </p>
          </div>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-4 h-4 mr-2" />
            {showForm ? "Cancelar" : "Nuevo tenant"}
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Crear nuevo tenant</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleCreate}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del local</Label>
                  <Input
                    id="name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Café de Prueba"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (identificador URL)</Label>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="cafe-prueba"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email de contacto</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color primario</Label>
                  <Input
                    id="color"
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) =>
                      setForm({ ...form, primaryColor: e.target.value })
                    }
                  />
                </div>
                {error && (
                  <div className="md:col-span-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}
                <div className="md:col-span-2">
                  <Button type="submit" disabled={creating}>
                    {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Crear tenant
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Listado</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : tenants.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Aún no hay tenants. Creá el primero arriba.
              </p>
            ) : (
              <div className="divide-y">
                {tenants.map((tenant) => (
                  <div
                    key={tenant._id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{tenant.name}</h3>
                        <Badge variant={tenant.active ? "success" : "secondary"}>
                          {tenant.active ? "Activo" : "Inactivo"}
                        </Badge>
                        <Badge variant="outline">{tenant.plan}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        /{tenant.slug} · {tenant.email}
                      </p>
                    </div>
                    <Link
                      href={`/maxadmin/users?tenantId=${tenant._id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Gestionar usuarios →
                    </Link>
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
