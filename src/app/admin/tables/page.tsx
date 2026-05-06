"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, QrCode, Download } from "lucide-react";
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

interface TableRow {
  _id: string;
  number: number;
  label?: string;
  capacity: number;
  status: string;
  zone?: string;
  active: boolean;
  qrToken: string;
}

const statusColor: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  free: "success",
  occupied: "warning",
  billing: "default",
  reserved: "secondary",
  disabled: "destructive",
};

/**
 * Página de gestión de mesas y descarga de QR.
 */
export default function TablesPage() {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ number: 1, capacity: 4, label: "", zone: "" });
  const [error, setError] = useState<string | null>(null);
  const [qrPreview, setQrPreview] = useState<{ id: string; src: string; number: number } | null>(null);

  /**
   * Carga la lista de mesas del tenant.
   */
  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/tables");
      const data = await res.json();
      setTables(data.tables || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /**
   * Crea una nueva mesa.
   */
  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        number: Number(form.number),
        capacity: Number(form.capacity),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo crear.");
      return;
    }
    setShowForm(false);
    setForm({ number: 1, capacity: 4, label: "", zone: "" });
    await load();
  }

  /**
   * Carga el QR de la mesa para previsualización.
   */
  async function showQR(id: string, number: number) {
    const res = await fetch(`/api/tables/${id}/qr`);
    const blob = await res.blob();
    const src = URL.createObjectURL(blob);
    setQrPreview({ id, src, number });
  }

  /**
   * Elimina una mesa.
   */
  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta mesa? El QR dejará de funcionar.")) return;
    await fetch(`/api/tables/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mesas</h1>
          <p className="text-muted-foreground mt-1">
            Cada mesa tiene un QR único que abre la carta.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? "Cancelar" : "Nueva mesa"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva mesa</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleCreate}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <div className="space-y-2">
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  type="number"
                  required
                  min={1}
                  value={form.number}
                  onChange={(e) =>
                    setForm({ ...form, number: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacidad</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  max={50}
                  value={form.capacity}
                  onChange={(e) =>
                    setForm({ ...form, capacity: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">Etiqueta</Label>
                <Input
                  id="label"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Terraza"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zone">Zona</Label>
                <Input
                  id="zone"
                  value={form.zone}
                  onChange={(e) => setForm({ ...form, zone: e.target.value })}
                  placeholder="Salón"
                />
              </div>
              {error && (
                <div className="col-span-2 md:col-span-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  {error}
                </div>
              )}
              <div className="col-span-2 md:col-span-4">
                <Button type="submit">Crear</Button>
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
          ) : tables.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Cargá la primera mesa para generar su QR.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {tables.map((t) => (
                <div
                  key={t._id}
                  className="rounded-lg border p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Mesa {t.number}</h3>
                    <Badge variant={statusColor[t.status] || "secondary"}>
                      {t.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Capacidad {t.capacity} · {t.label || "—"}
                  </p>
                  <div className="mt-auto flex items-center gap-1 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => showQR(t._id, t.number)}
                      className="flex-1"
                    >
                      <QrCode className="w-3.5 h-3.5 mr-1" />
                      QR
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(t._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {qrPreview && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-sm w-full">
            <CardHeader>
              <CardTitle>QR Mesa {qrPreview.number}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <img
                src={qrPreview.src}
                alt={`QR Mesa ${qrPreview.number}`}
                className="w-full rounded-lg border"
              />
              <div className="flex gap-2">
                <a
                  href={qrPreview.src}
                  download={`mesa-${qrPreview.number}.png`}
                  className="flex-1"
                >
                  <Button className="w-full" variant="default">
                    <Download className="w-4 h-4 mr-2" />
                    Descargar
                  </Button>
                </a>
                <Button
                  variant="outline"
                  onClick={() => setQrPreview(null)}
                  className="flex-1"
                >
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
