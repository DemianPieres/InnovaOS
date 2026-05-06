"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  Plus,
  UserCog,
  Pencil,
  Power,
  PowerOff,
  X,
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

const initialCreateForm = {
  email: "",
  name: "",
  password: "",
  role: "admin",
};

interface EditForm {
  id: string;
  name: string;
  role: string;
  password: string;
  active: boolean;
  email: string;
}

function UsersContent() {
  const searchParams = useSearchParams();
  const initialTenantId = searchParams.get("tenantId") || "";

  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [tenantId, setTenantId] = useState(initialTenantId);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

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
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/maxadmin/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...createForm, tenantId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear el usuario.");
        return;
      }
      setShowForm(false);
      setCreateForm(initialCreateForm);
      await loadUsers(tenantId);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Abre el modal de edición precargado con los datos actuales del usuario.
   */
  function startEdit(user: UserRow) {
    setEditForm({
      id: user._id,
      name: user.name,
      role: user.role,
      password: "",
      active: user.active,
      email: user.email,
    });
    setError(null);
  }

  /**
   * Guarda los cambios del usuario en edición. Solo envía password si fue completado.
   */
  async function handleSaveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editForm) return;
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name,
        role: editForm.role,
        active: editForm.active,
      };
      if (editForm.password.trim().length > 0) {
        payload.password = editForm.password;
      }
      const res = await fetch(`/maxadmin/api/users/${editForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar.");
        return;
      }
      setEditForm(null);
      await loadUsers(tenantId);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Cambia el estado activo/inactivo de un usuario directamente desde la lista.
   */
  async function toggleActive(user: UserRow) {
    const action = user.active ? "desactivar" : "reactivar";
    if (!confirm(`¿Seguro que querés ${action} a "${user.name}"?`)) return;
    setBusy(true);
    try {
      if (user.active) {
        await fetch(`/maxadmin/api/users/${user._id}`, { method: "DELETE" });
      } else {
        await fetch(`/maxadmin/api/users/${user._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: true }),
        });
      }
      await loadUsers(tenantId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <MaxAdminShell>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Usuarios</h1>
            <p className="text-muted-foreground mt-1">
              Gestioná los usuarios de cada local: editar rol, resetear contraseña
              o desactivar acceso.
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
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        email: e.target.value.trim(),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, password: e.target.value })
                    }
                    placeholder="Mín 8 chars, mayús + minús + dígito"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <select
                    id="role"
                    value={createForm.role}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, role: e.target.value })
                    }
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
                  <Button type="submit" disabled={busy}>
                    {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
                    className="flex items-center justify-between py-3 gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCog className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <Badge variant="outline">{user.role}</Badge>
                      <Badge variant={user.active ? "success" : "secondary"}>
                        {user.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(user)}
                        title="Editar usuario"
                        disabled={busy}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(user)}
                        title={user.active ? "Desactivar" : "Reactivar"}
                        disabled={busy}
                      >
                        {user.active ? (
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
          <Card className="max-w-md w-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Editar usuario</CardTitle>
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
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={editForm.email} disabled />
                  <p className="text-xs text-muted-foreground">
                    El email no se puede modificar para preservar el historial.
                  </p>
                </div>
                <div className="space-y-2">
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
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Rol</Label>
                  <select
                    id="edit-role"
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    {roles.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-password">
                    Nueva contraseña{" "}
                    <span className="text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    id="edit-password"
                    type="password"
                    minLength={8}
                    value={editForm.password}
                    onChange={(e) =>
                      setEditForm({ ...editForm, password: e.target.value })
                    }
                    placeholder="Dejar vacío para no cambiar"
                  />
                  <p className="text-xs text-muted-foreground">
                    Si la cambiás, la sesión activa del usuario quedará invalidada.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={editForm.active}
                    onChange={(e) =>
                      setEditForm({ ...editForm, active: e.target.checked })
                    }
                  />
                  Usuario activo
                </label>
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}
                <div className="flex gap-2">
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

/**
 * Página de gestión de usuarios desde MAXADMIN: crear, editar y desactivar.
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
