"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Envía el formulario de login al endpoint de auth.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          tenantSlug: tenantSlug || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo iniciar sesión.");
        setLoading(false);
        return;
      }
      router.push(from);
      router.refresh();
    } catch {
      setError("Error de red. Verificá tu conexión.");
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl">Acceso al sistema</CardTitle>
        <CardDescription>
          Ingresá con tu usuario del local. Tu sesión es única por dispositivo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              placeholder="vos@local.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenantSlug">
              Slug del local{" "}
              <span className="text-muted-foreground">(recomendado)</span>
            </Label>
            <Input
              id="tenantSlug"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              placeholder="cafe-valen"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Es el identificador del local. Lo encontrás en la URL pública:
              /menu/<span className="font-mono">[slug]</span>
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ingresar
          </Button>

          <p className="text-xs text-center text-muted-foreground pt-2">
            ¿Sos el administrador de la plataforma?{" "}
            <Link href="/maxadmin/login" className="underline">
              Acceder al MAXADMIN
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Página de login del sistema (usuarios de tenants).
 */
export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense
        fallback={
          <div className="text-muted-foreground text-sm">Cargando…</div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
