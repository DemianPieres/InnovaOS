"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface PaymentDialogProps {
  orderId: string;
  total: number;
  onClose: () => void;
  onSuccess: () => void;
}

const methods = [
  { v: "cash", l: "Efectivo" },
  { v: "credit", l: "Crédito" },
  { v: "debit", l: "Débito" },
  { v: "transfer", l: "Transferencia" },
  { v: "mercadopago", l: "MercadoPago" },
  { v: "qr", l: "QR" },
  { v: "other", l: "Otro" },
];

/**
 * Modal para procesar el pago de un pedido vinculándolo a la caja abierta.
 */
export function PaymentDialog({
  orderId,
  total,
  onClose,
  onSuccess,
}: PaymentDialogProps) {
  const [method, setMethod] = useState("cash");
  const [tip, setTip] = useState("0");
  const [received, setReceived] = useState(String(total));
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tipNumber = Number(tip) || 0;
  const totalWithTip = total + tipNumber;
  const change =
    method === "cash"
      ? Math.max(0, (Number(received) || 0) - totalWithTip)
      : 0;

  /**
   * Envía el pago al endpoint y notifica al padre.
   */
  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          method,
          amount: total,
          tip: tipNumber,
          receivedAmount:
            method === "cash" ? Number(received) || undefined : undefined,
          reference: reference || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo procesar el pago.");
        return;
      }
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cobrar pedido</CardTitle>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-3 flex items-center justify-between">
            <span className="text-sm">Subtotal</span>
            <span className="font-semibold">{formatCurrency(total)}</span>
          </div>

          <div className="space-y-2">
            <Label>Método</Label>
            <div className="grid grid-cols-3 gap-2">
              {methods.map((m) => (
                <button
                  type="button"
                  key={m.v}
                  onClick={() => setMethod(m.v)}
                  className={`text-sm rounded-md border h-10 ${
                    method === m.v
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-accent"
                  }`}
                >
                  {m.l}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tip">Propina (opcional)</Label>
            <Input
              id="tip"
              type="number"
              min={0}
              value={tip}
              onChange={(e) => setTip(e.target.value)}
            />
          </div>

          {method === "cash" && (
            <div className="space-y-2">
              <Label htmlFor="received">Recibido</Label>
              <Input
                id="received"
                type="number"
                min={0}
                value={received}
                onChange={(e) => setReceived(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Vuelto: <span className="font-medium text-foreground">{formatCurrency(change)}</span>
              </p>
            </div>
          )}

          {(method === "transfer" || method === "mercadopago" || method === "qr") && (
            <div className="space-y-2">
              <Label htmlFor="reference">Referencia / N° operación</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          )}

          <div className="rounded-md bg-primary/5 p-3 flex items-center justify-between">
            <span className="font-medium">Total a cobrar</span>
            <span className="text-xl font-bold">
              {formatCurrency(totalWithTip)}
            </span>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full"
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar pago
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
