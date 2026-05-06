"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency } from "@/lib/utils";

interface MenuTenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor: string;
  currency: string;
  loyaltyEnabled: boolean;
}

interface MenuTable {
  id: string;
  number: number;
  label?: string;
}

interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  order: number;
}

interface MenuProduct {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  order: number;
  tags?: string[];
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface MenuData {
  tenant: MenuTenant;
  table: MenuTable | null;
  categories: MenuCategory[];
  products: MenuProduct[];
}

interface MenuClientProps {
  slug: string;
  tableNumber?: string;
  qrToken?: string;
}

/**
 * Carta interactiva del cliente. Maneja categorías, productos, carrito y checkout.
 */
export function MenuClient({ slug, tableNumber, qrToken }: MenuClientProps) {
  const [data, setData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    consentWhatsapp: false,
    notes: "",
    register: false,
  });

  /**
   * Carga la carta y la mesa desde el endpoint público.
   */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const params = new URLSearchParams();
        if (tableNumber) params.set("table", tableNumber);
        if (qrToken) params.set("t", qrToken);
        const res = await fetch(`/api/menu/${slug}?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(json.error || "Local no disponible.");
          return;
        }
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("No se pudo cargar el menú.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug, tableNumber, qrToken]);

  const cartTotal = useMemo(
    () => cart.reduce((acc, it) => acc + it.price * it.quantity, 0),
    [cart]
  );
  const cartCount = useMemo(
    () => cart.reduce((acc, it) => acc + it.quantity, 0),
    [cart]
  );

  /**
   * Suma un producto al carrito (o aumenta cantidad si ya está).
   */
  function addToCart(product: MenuProduct) {
    setCart((prev) => {
      const existing = prev.find((it) => it.productId === product.id);
      if (existing) {
        return prev.map((it) =>
          it.productId === product.id ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  }

  /**
   * Cambia la cantidad de un item del carrito (si llega a 0, lo remueve).
   */
  function changeQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((it) =>
          it.productId === productId
            ? { ...it, quantity: Math.max(0, it.quantity + delta) }
            : it
        )
        .filter((it) => it.quantity > 0)
    );
  }

  /**
   * Envía el pedido al endpoint público.
   */
  async function submitOrder() {
    if (!data || !data.table) {
      setError("Necesitás escanear el QR de tu mesa para hacer el pedido.");
      return;
    }
    if (cart.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug: slug,
          tableNumber: data.table.number,
          qrToken,
          notes: customer.notes || undefined,
          customer:
            customer.register && customer.name && customer.phone
              ? {
                  name: customer.name,
                  phone: customer.phone,
                  consentWhatsapp: customer.consentWhatsapp,
                }
              : undefined,
          items: cart.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "No se pudo enviar el pedido.");
        return;
      }
      setSuccess(json.orderId);
      setCart([]);
      setCheckoutOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </main>
    );
  }
  if (error && !data) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Local no disponible</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }
  if (!data) return null;

  const productsByCategory = data.categories.map((cat) => ({
    category: cat,
    items: data.products
      .filter((p) => p.categoryId === cat.id)
      .sort((a, b) => a.order - b.order),
  }));

  const primary = data.tenant.primaryColor;

  return (
    <main
      className="min-h-screen pb-32"
      style={{ "--tenant-primary": primary } as React.CSSProperties}
    >
      <header className="sticky top-0 z-30 glass border-b backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-lg leading-tight">
              {data.tenant.name}
            </h1>
            {data.table ? (
              <p className="text-xs text-muted-foreground">
                Mesa {data.table.number}
                {data.table.label ? ` · ${data.table.label}` : ""}
              </p>
            ) : (
              <p className="text-xs text-amber-600">
                Solo lectura. Escaneá el QR de tu mesa para pedir.
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 pt-6 space-y-8">
        {success && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
            ¡Listo! Tu pedido fue recibido. Código de seguimiento:{" "}
            <span className="font-mono">{success.slice(-8).toUpperCase()}</span>
          </div>
        )}

        {productsByCategory.map(({ category, items }) =>
          items.length === 0 ? null : (
            <section key={category.id} className="space-y-3 animate-fade-in">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  {category.name}
                </h2>
                {category.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {category.description}
                  </p>
                )}
              </div>
              <div className="rounded-2xl border bg-card divide-y">
                {items.map((product) => {
                  const inCart = cart.find((c) => c.productId === product.id);
                  return (
                    <article
                      key={product.id}
                      className="p-4 flex items-start justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium leading-snug">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                        <p className="font-semibold mt-2">
                          {formatCurrency(product.price, data.tenant.currency)}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {inCart ? (
                          <div className="inline-flex items-center gap-2 rounded-full border bg-background">
                            <button
                              type="button"
                              onClick={() => changeQuantity(product.id, -1)}
                              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-accent"
                              aria-label="Restar"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-sm font-medium w-5 text-center">
                              {inCart.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => changeQuantity(product.id, 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-accent"
                              aria-label="Sumar"
                              style={{
                                background: primary,
                                color: "white",
                              }}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart(product)}
                            disabled={!data.table}
                            className={cn(
                              "rounded-full px-4 h-9 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                            style={{
                              background: primary,
                              color: "white",
                            }}
                          >
                            Agregar
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )
        )}

        {data.products.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">
            La carta todavía está vacía.
          </p>
        )}
      </div>

      {cartCount > 0 && data.table && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-4 animate-slide-up">
          <button
            type="button"
            onClick={() => setCheckoutOpen(true)}
            className="w-full max-w-2xl mx-auto rounded-2xl shadow-2xl px-5 py-4 flex items-center justify-between text-white font-medium"
            style={{ background: primary }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span>
                {cartCount} {cartCount === 1 ? "ítem" : "ítems"} ·{" "}
                {formatCurrency(cartTotal, data.tenant.currency)}
              </span>
            </div>
            <span className="text-sm">Ver pedido →</span>
          </button>
        </div>
      )}

      {checkoutOpen && data.table && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
          <div className="bg-card rounded-2xl border shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">Confirmar pedido</h2>
                <p className="text-xs text-muted-foreground">
                  Mesa {data.table.number}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                {cart.map((it) => (
                  <div
                    key={it.productId}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{it.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {it.quantity} × {formatCurrency(it.price, data.tenant.currency)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => changeQuantity(it.productId, -1)}
                        className="w-7 h-7 rounded-full border hover:bg-accent flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">
                        {it.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(it.productId, 1)}
                        className="w-7 h-7 rounded-full border hover:bg-accent flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(cartTotal, data.tenant.currency)}</span>
              </div>

              <Textarea
                placeholder="Notas para el pedido (opcional)"
                value={customer.notes}
                onChange={(e) =>
                  setCustomer((c) => ({ ...c, notes: e.target.value }))
                }
                rows={2}
              />

              {data.tenant.loyaltyEnabled && (
                <div className="rounded-lg border p-3 space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customer.register}
                      onChange={(e) =>
                        setCustomer((c) => ({ ...c, register: e.target.checked }))
                      }
                    />
                    Sumar puntos a mi cuenta de fidelización
                  </label>
                  {customer.register && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2 space-y-1.5">
                        <Label htmlFor="cust-name">Nombre</Label>
                        <Input
                          id="cust-name"
                          value={customer.name}
                          onChange={(e) =>
                            setCustomer((c) => ({ ...c, name: e.target.value }))
                          }
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label htmlFor="cust-phone">Teléfono</Label>
                        <Input
                          id="cust-phone"
                          type="tel"
                          value={customer.phone}
                          onChange={(e) =>
                            setCustomer((c) => ({ ...c, phone: e.target.value }))
                          }
                          placeholder="+54 11 1234 5678"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={customer.consentWhatsapp}
                            onChange={(e) =>
                              setCustomer((c) => ({
                                ...c,
                                consentWhatsapp: e.target.checked,
                              }))
                            }
                          />
                          Acepto recibir comunicaciones por WhatsApp.
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <Button
                type="button"
                onClick={submitOrder}
                disabled={submitting || cart.length === 0}
                className="w-full text-white"
                style={{ background: primary }}
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar pedido
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
