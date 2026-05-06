"use client";

import { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  level: string;
  segment: string;
  totalSpent: number;
  visitsCount: number;
  lastVisitAt?: string;
  consents: { whatsapp: boolean; email: boolean };
}

const levelColor: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "outline"
> = {
  bronce: "secondary",
  plata: "outline",
  oro: "warning",
  platino: "default",
};

/**
 * Página de clientes con segmentación y niveles de fidelización.
 */
export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<string>("all");

  /**
   * Carga clientes con filtros aplicados.
   */
  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (segment !== "all") params.set("segment", segment);
      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      setCustomers(data.customers || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [search, segment]);

  const segments = [
    { v: "all", l: "Todos" },
    { v: "nuevo", l: "Nuevos" },
    { v: "ocasional", l: "Ocasionales" },
    { v: "habitual", l: "Habituales" },
    { v: "vip", l: "VIP" },
    { v: "inactivo", l: "Inactivos" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="w-7 h-7" />
          Clientes
        </h1>
        <p className="text-muted-foreground mt-1">
          Base con puntos, niveles y segmentación.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <Input
            placeholder="Buscar por nombre, teléfono o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-1 flex-wrap">
            {segments.map((s) => (
              <Button
                key={s.v}
                size="sm"
                variant={segment === s.v ? "default" : "outline"}
                onClick={() => setSegment(s.v)}
              >
                {s.l}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{customers.length} clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : customers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Sin clientes para los filtros aplicados.
            </p>
          ) : (
            <div className="divide-y">
              {customers.map((c) => (
                <div
                  key={c._id}
                  className="py-3 flex items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{c.name}</h3>
                      <Badge variant={levelColor[c.level] || "secondary"}>
                        {c.level}
                      </Badge>
                      <Badge variant="outline">{c.segment}</Badge>
                      {c.consents.whatsapp && (
                        <Badge variant="success">WhatsApp ✓</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.phone}
                      {c.email ? ` · ${c.email}` : ""}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">{formatCurrency(c.totalSpent)}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.visitsCount} visitas · {c.points} pts
                    </p>
                    {c.lastVisitAt && (
                      <p className="text-xs text-muted-foreground">
                        Última: {formatDate(c.lastVisitAt)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
