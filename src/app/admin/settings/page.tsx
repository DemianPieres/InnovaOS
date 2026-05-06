"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface TenantData {
  _id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  config: {
    primaryColor: string;
    currency: string;
    timezone: string;
    language: string;
    loyaltyEnabled: boolean;
    pointsPerCurrencyUnit: number;
  };
}

interface BranchRow {
  _id: string;
  name: string;
  address?: string;
  phone?: string;
  isMain: boolean;
  active: boolean;
}

/**
 * Página de configuración del tenant: branding, fidelización y sucursales.
 */
export default function SettingsPage() {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [branchForm, setBranchForm] = useState({ name: "", address: "", phone: "" });

  /**
   * Carga datos del tenant y sucursales.
   */
  async function load() {
    setLoading(true);
    try {
      const [tRes, bRes] = await Promise.all([
        fetch("/api/tenant"),
        fetch("/api/branches"),
      ]);
      const [tData, bData] = await Promise.all([tRes.json(), bRes.json()]);
      setTenant(tData.tenant);
      setBranches(bData.branches || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /**
   * Guarda cambios del tenant.
   */
  async function saveTenant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenant) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tenant.name,
          phone: tenant.phone,
          address: tenant.address,
          logoUrl: tenant.logoUrl || undefined,
          config: tenant.config,
        }),
      });
      if (res.ok) {
        setSavedAt(new Date());
      }
    } finally {
      setSaving(false);
    }
  }

  /**
   * Crea una nueva sucursal.
   */
  async function addBranch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const res = await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(branchForm),
    });
    if (res.ok) {
      setBranchForm({ name: "", address: "", phone: "" });
      await load();
    }
  }

  if (loading || !tenant) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground mt-1">
          Personalizá la apariencia, fidelización y sucursales del local.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del local</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveTenant} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Nombre</Label>
              <Input
                value={tenant.name}
                onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL pública)</Label>
              <Input value={tenant.slug} disabled />
              <p className="text-xs text-muted-foreground">
                /menu/{tenant.slug}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={tenant.email} disabled />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={tenant.phone || ""}
                onChange={(e) => setTenant({ ...tenant, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input
                value={tenant.address || ""}
                onChange={(e) => setTenant({ ...tenant, address: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Logo URL (opcional)</Label>
              <Input
                value={tenant.logoUrl || ""}
                onChange={(e) => setTenant({ ...tenant, logoUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-2">
              <Label>Color primario</Label>
              <Input
                type="color"
                value={tenant.config.primaryColor}
                onChange={(e) =>
                  setTenant({
                    ...tenant,
                    config: { ...tenant.config, primaryColor: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Input
                value={tenant.config.currency}
                onChange={(e) =>
                  setTenant({
                    ...tenant,
                    config: { ...tenant.config, currency: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2 border-t pt-4">
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tenant.config.loyaltyEnabled}
                  onChange={(e) =>
                    setTenant({
                      ...tenant,
                      config: {
                        ...tenant.config,
                        loyaltyEnabled: e.target.checked,
                      },
                    })
                  }
                />
                Programa de fidelización activo
              </Label>
            </div>
            {tenant.config.loyaltyEnabled && (
              <div className="space-y-2">
                <Label>Puntos por cada $100 gastados</Label>
                <Input
                  type="number"
                  min={0}
                  max={1000}
                  value={tenant.config.pointsPerCurrencyUnit}
                  onChange={(e) =>
                    setTenant({
                      ...tenant,
                      config: {
                        ...tenant.config,
                        pointsPerCurrencyUnit: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
            )}
            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Guardar cambios
              </Button>
              {savedAt && (
                <span className="text-xs text-muted-foreground">
                  Guardado a las {savedAt.toLocaleTimeString("es-AR")}
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sucursales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {branches.map((b) => (
              <div
                key={b._id}
                className="flex items-center justify-between border-b pb-2 last:border-0"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{b.name}</p>
                    {b.isMain && <Badge variant="default">Principal</Badge>}
                    {!b.active && <Badge variant="secondary">Inactiva</Badge>}
                  </div>
                  {b.address && (
                    <p className="text-xs text-muted-foreground">{b.address}</p>
                  )}
                </div>
                {b.phone && (
                  <span className="text-xs text-muted-foreground">{b.phone}</span>
                )}
              </div>
            ))}
          </div>
          <form onSubmit={addBranch} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Nombre"
              required
              value={branchForm.name}
              onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
            />
            <Input
              placeholder="Dirección"
              value={branchForm.address}
              onChange={(e) =>
                setBranchForm({ ...branchForm, address: e.target.value })
              }
            />
            <div className="flex gap-2">
              <Input
                placeholder="Teléfono"
                value={branchForm.phone}
                onChange={(e) =>
                  setBranchForm({ ...branchForm, phone: e.target.value })
                }
              />
              <Button type="submit" size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp (próximamente)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Configurá <span className="font-mono">WHATSAPP_API_TOKEN</span> o{" "}
            <span className="font-mono">TWILIO_ACCOUNT_SID</span> en las
            variables de entorno para activar los mensajes automáticos.
          </p>
          <p>Triggers soportados:</p>
          <ul className="list-disc list-inside">
            <li>Bienvenida al registrarse desde la carta</li>
            <li>Confirmación de pedido</li>
            <li>Pedido listo para retirar</li>
            <li>Cumpleaños</li>
            <li>Winback de cliente inactivo</li>
            <li>Subida de nivel de fidelización</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
