"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Wallet, Plus, Calculator } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CashRegister {
  _id: string;
  status: "open" | "closed";
  openingAmount: number;
  openedAt: string;
}

interface Transaction {
  _id: string;
  type: "income" | "expense" | "withdraw" | "deposit";
  amount: number;
  description: string;
  createdAt: string;
}

interface PaymentRow {
  _id: string;
  method: string;
  total: number;
  createdAt: string;
}

const billDenominations = [10000, 2000, 1000, 500, 200, 100, 50, 20, 10];

/**
 * Página de caja con apertura, cierre, registro de transacciones,
 * calculadora de billetes y resumen del turno.
 */
export default function CashPage() {
  const [register, setRegister] = useState<CashRegister | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openingAmount, setOpeningAmount] = useState("");
  const [openingNote, setOpeningNote] = useState("");

  const [txForm, setTxForm] = useState({
    type: "expense" as Transaction["type"],
    amount: "",
    description: "",
  });

  const [closeForm, setCloseForm] = useState({
    notes: "",
  });
  const [bills, setBills] = useState<Record<number, number>>({});

  /**
   * Carga estado actual de caja, pagos y transacciones.
   */
  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/cash/current");
      const data = await res.json();
      setRegister(data.register || null);
      setTransactions(data.transactions || []);
      setPayments(data.payments || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /**
   * Abre caja con monto inicial.
   */
  async function handleOpen(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/cash/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        openingAmount: Number(openingAmount),
        notes: openingNote || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo abrir caja.");
      return;
    }
    setOpeningAmount("");
    setOpeningNote("");
    await load();
  }

  /**
   * Registra un movimiento manual de caja.
   */
  async function handleAddTx(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/cash/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: txForm.type,
        amount: Number(txForm.amount),
        description: txForm.description,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo registrar.");
      return;
    }
    setTxForm({ type: "expense", amount: "", description: "" });
    await load();
  }

  /**
   * Calcula el monto total a partir del conteo de billetes.
   */
  const billsTotal = useMemo(
    () =>
      Object.entries(bills).reduce(
        (acc, [denom, count]) => acc + Number(denom) * count,
        0
      ),
    [bills]
  );

  /**
   * Cierra caja con monto contado y conteo de billetes.
   */
  async function handleClose(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (billsTotal <= 0) {
      setError("Cargá el conteo de billetes primero.");
      return;
    }
    const res = await fetch("/api/cash/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        closingAmount: billsTotal,
        notes: closeForm.notes || undefined,
        billsCount: Object.fromEntries(
          Object.entries(bills).map(([k, v]) => [k, Number(v)])
        ),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo cerrar caja.");
      return;
    }
    setBills({});
    setCloseForm({ notes: "" });
    await load();
  }

  const cashIncome = useMemo(
    () =>
      payments
        .filter((p) => p.method === "cash")
        .reduce((acc, p) => acc + p.total, 0),
    [payments]
  );
  const txDelta = useMemo(
    () =>
      transactions.reduce((acc, t) => {
        if (t.type === "income" || t.type === "deposit") return acc + t.amount;
        if (t.type === "expense" || t.type === "withdraw") return acc - t.amount;
        return acc;
      }, 0),
    [transactions]
  );
  const expected = (register?.openingAmount || 0) + cashIncome + txDelta;
  const difference = billsTotal > 0 ? billsTotal - expected : 0;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wallet className="w-7 h-7" />
          Caja
        </h1>
        <p className="text-muted-foreground mt-1">
          Apertura, movimientos y cierre con conteo de billetes.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : !register ? (
        <Card>
          <CardHeader>
            <CardTitle>Abrir caja</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOpen} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openingAmount">Monto inicial en caja</Label>
                <Input
                  id="openingAmount"
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="openingNote">Notas (opcional)</Label>
                <Textarea
                  id="openingNote"
                  rows={2}
                  value={openingNote}
                  onChange={(e) => setOpeningNote(e.target.value)}
                />
              </div>
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  {error}
                </div>
              )}
              <Button type="submit">Abrir caja</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Turno actual</CardTitle>
                <Badge variant="success">Abierta</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Apertura</p>
                  <p className="font-medium">{formatDate(register.openedAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Inicial</p>
                  <p className="font-medium">
                    {formatCurrency(register.openingAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ingresos cash</p>
                  <p className="font-medium">{formatCurrency(cashIncome)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Movimientos</p>
                  <p className="font-medium">{formatCurrency(txDelta)}</p>
                </div>
              </div>
              <div className="mt-4 p-4 rounded-lg bg-muted">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Esperado en caja</span>
                  <span className="text-2xl font-bold">
                    {formatCurrency(expected)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Movimiento manual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddTx} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="txType">Tipo</Label>
                      <select
                        id="txType"
                        value={txForm.type}
                        onChange={(e) =>
                          setTxForm({
                            ...txForm,
                            type: e.target.value as Transaction["type"],
                          })
                        }
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="income">Ingreso extra</option>
                        <option value="expense">Gasto</option>
                        <option value="deposit">Depósito</option>
                        <option value="withdraw">Retiro</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="txAmount">Monto</Label>
                      <Input
                        id="txAmount"
                        type="number"
                        min={0}
                        step="0.01"
                        required
                        value={txForm.amount}
                        onChange={(e) =>
                          setTxForm({ ...txForm, amount: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="txDesc">Descripción</Label>
                    <Input
                      id="txDesc"
                      required
                      value={txForm.description}
                      onChange={(e) =>
                        setTxForm({ ...txForm, description: e.target.value })
                      }
                    />
                  </div>
                  <Button type="submit" size="sm">
                    Registrar
                  </Button>
                </form>
                <div className="mt-4 space-y-1 text-sm max-h-48 overflow-y-auto">
                  {transactions.map((t) => (
                    <div
                      key={t._id}
                      className="flex items-center justify-between border-b pb-1.5 last:border-0"
                    >
                      <div>
                        <p className="font-medium">{t.description}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {t.type}
                        </p>
                      </div>
                      <span
                        className={
                          t.type === "income" || t.type === "deposit"
                            ? "text-emerald-600 font-medium"
                            : "text-destructive font-medium"
                        }
                      >
                        {t.type === "income" || t.type === "deposit" ? "+" : "−"}
                        {formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Calculadora de billetes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {billDenominations.map((d) => (
                    <div key={d} className="space-y-1">
                      <Label className="text-xs">{formatCurrency(d)}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={bills[d] || ""}
                        onChange={(e) =>
                          setBills({
                            ...bills,
                            [d]: Number(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-md bg-muted flex items-center justify-between">
                  <span className="text-sm">Total contado</span>
                  <span className="text-xl font-bold">
                    {formatCurrency(billsTotal)}
                  </span>
                </div>
                {billsTotal > 0 && (
                  <div className="mt-2 text-sm">
                    Diferencia con esperado:{" "}
                    <span
                      className={
                        difference === 0
                          ? "text-muted-foreground"
                          : difference > 0
                            ? "text-emerald-600 font-medium"
                            : "text-destructive font-medium"
                      }
                    >
                      {difference >= 0 ? "+" : ""}
                      {formatCurrency(difference)}
                    </span>
                  </div>
                )}
                <form onSubmit={handleClose} className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="closeNotes">Notas de cierre</Label>
                    <Textarea
                      id="closeNotes"
                      rows={2}
                      value={closeForm.notes}
                      onChange={(e) =>
                        setCloseForm({ ...closeForm, notes: e.target.value })
                      }
                    />
                  </div>
                  {error && (
                    <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                      {error}
                    </div>
                  )}
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={billsTotal <= 0}
                  >
                    Cerrar caja
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pagos del turno</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Sin pagos registrados.
                </p>
              ) : (
                <div className="divide-y">
                  {payments.map((p) => (
                    <div
                      key={p._id}
                      className="flex items-center justify-between py-2"
                    >
                      <div>
                        <p className="font-medium capitalize">{p.method}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(p.createdAt)}
                        </p>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(p.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
