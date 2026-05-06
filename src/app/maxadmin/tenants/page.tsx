"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Plus,
  Pencil,
  Power,
  PowerOff,
  X,
  Users as UsersIcon,
} from "lucide-react";
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
  phone?: string;
  address?: string;
  active: boolean;
  plan: "basic" | "pro" | "enterprise";
  config: {
    primaryColor: string;
    currency: string;
    loyaltyEnabled: boolean;
  };
  createdAt: string;
}

const initialCreateForm = {
  name: "",
  slug: "",
  email: "",
  phone: "",
  address: "",
  primaryColor: "#2563eb",
};

interface EditForm {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  primaryColor: string;
  plan: "basic" | "pro" | "enterprise";
  active: boolean;
  loyaltyEnabled: boolean;
}

/**
 * Página de gestión de tenants para MAXADMIN: crear, editar, activar/desactivar.
 */
export default function MaxAdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

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
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/maxadmin/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear el tenant.");
        return;
      }
      setShowForm(false);
      setCreateForm(initialCreateForm);
      await loadTenants();
    } finally {
      setBusy(false);
    }
  }

  /**
   * Abre el modal de edición precargado con los datos del tenant.
   */
  function startEdit(tenant: TenantRow) {
    setEditForm({
      id: tenant._id,
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone || "",
      address: tenant.address || "",
      primaryColor: tenant.config.primaryColor,
      plan: tenant.plan,
      active: tenant.active,
      loyaltyEnabled: tenant.config.loyaltyEnabled,
    });
    setError(null);
  }

  /**
   * Guarda los cambios del tenant en edición.
   */
  async function handleSaveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editForm) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/maxadmin/api/tenants/${editForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone || undefined,
          address: editForm.address || undefined,
          plan: editForm.plan,
          active: editForm.active,
          config: {
            primaryColor: editForm.primaryColor,
            loyaltyEnabled: editForm.loyaltyEnabled,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar.");
        return;
      }
      setEditForm(null);
      await loadTenants();
    } finally {
      setBusy(false);
    }
  }

  /**
   * Cambia el estado activo/inactivo de un tenant directo desde la lista.
   */
  async function toggleActive(tenant: TenantRow) {
    const action = tenant.active ? "desactivar" : "reactivar";
    if (
      !confirm(
        `¿Seguro que querés ${action} "${tenant.name}"? ${
          tenant.active
            ? "Los usuarios no podrán loguearse y la carta pública dejará de cargar."
            : ""
        }`
      )
    )
      return;
    setBusy(true);
    try {
      await fetch(`/maxadmin/api/tenants/${tenant._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !tenant.active }),
      });
      await loadTenants();
    } finally {
      setBusy(false);
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
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, name: e.target.value })
                    }
                    placeholder="Café de Prueba"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (identificador URL)</Label>
                  <Input
                    id="slug"
                    value={createForm.slug}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, slug: e.target.value })
                    }
                    placeholder="cafe-prueba"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email de contacto</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={createForm.phone}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={createForm.address}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, address: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color primario</Label>
                  <Input
                    id="color"
                    type="color"
                    value={createForm.primaryColor}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        primaryColor: e.target.value,
                      })
                    }
                  />
                </div>
                {error && (
                  <div className="md:col-span-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}
                <div className="md:col-span-2">
                  <Button type="submit" disabled={busy}>
                    {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
                    className="flex items-center justify-between py-3 gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium truncate">{tenant.name}</h3>
                        <Badge variant={tenant.active ? "success" : "secondary"}>
                          {tenant.active ? "Activo" : "Inactivo"}
                        </Badge>
                        <Badge variant="outline">{tenant.plan}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        /{tenant.slug} · {tenant.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={`/maxadmin/users?tenantId=${tenant._id}`}
                        className="text-sm text-primary hover:underline mr-2 hidden md:flex items-center gap-1"
                      >
                        <UsersIcon className="w-3.5 h-3.5" />
                        Usuarios
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(tenant)}
                        title="Editar tenant"
                        disabled={busy}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(tenant)}
                        title={tenant.active ? "Desactivar" : "Reactivar"}
                        disabled={busy}
                      >
                        {tenant.active ? (
                          <PowerOff className="w-4 h-4 text-destructive" />
                        ) : (
                          <Power className="w-4 h-4 text-emerald-600" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {editForm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Editar tenant</CardTitle>
              <button
                type="button"
                onClick={() => setEditForm(null)}
                className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSaveEdit}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-name">Nombre</Label>
                  <Input
                    id="edit-name"
                    required
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Teléfono</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-color">Color primario</Label>
                  <Input
                    id="edit-color"
                    type="color"
                    value={editForm.primaryColor}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        primaryColor: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-address">Dirección</Label>
                  <Input
                    id="edit-address"
                    value={editForm.address}
                    onChange={(e) =>
                      setEditForm({ ...editForm, address: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-plan">Plan</Label>
                  <select
                    id="edit-plan"
                    value={editForm.plan}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        plan: e.target.value as EditForm["plan"],
                      })
                    }
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-sm md:col-span-2">
                  <input
                    type="checkbox"
                    checked={editForm.active}
                    onChange={(e) =>
                      setEditForm({ ...editForm, active: e.target.checked })
                    }
                  />
                  Tenant activo (login y carta pública habilitados)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm md:col-span-2">
                  <input
                    type="checkbox"
                    checked={editForm.loyaltyEnabled}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        loyaltyEnabled: e.target.checked,
                      })
                    }
                  />
                  Programa de fidelización habilitado
                </label>
                {error && (
                  <div className="md:col-span-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}
                <div className="md:col-span-2 flex gap-2">
                  <Button type="submit" disabled={busy} className="flex-1">
                    {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Guardar cambios
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditForm(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </MaxAdminShell>
  );
}
