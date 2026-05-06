import Link from "next/link";

/**
 * Home pública: redirige al usuario hacia el login del sistema o del MAXADMIN.
 */
export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="max-w-2xl w-full text-center space-y-8 animate-fade-in">
        <div className="space-y-2">
          <span className="inline-block text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Plataforma multi-tenant
          </span>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            <span className="gradient-text">InnovaOS</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Pedidos por QR, caja inteligente, fidelización y analytics para tu local.
            Una sola plataforma, todos los locales.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          <Link
            href="/login"
            className="group rounded-xl border bg-card p-6 text-left hover:border-primary transition-all hover:shadow-md"
          >
            <h2 className="font-semibold text-lg">Acceso al sistema</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Para usuarios de un local: admin, mozo, cocina, barra, caja.
            </p>
            <span className="text-primary text-sm mt-3 inline-block group-hover:underline">
              Iniciar sesión →
            </span>
          </Link>

          <Link
            href="/maxadmin/login"
            className="group rounded-xl border bg-card p-6 text-left hover:border-primary transition-all hover:shadow-md"
          >
            <h2 className="font-semibold text-lg">MAXADMIN</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Acceso exclusivo del operador de la plataforma.
            </p>
            <span className="text-primary text-sm mt-3 inline-block group-hover:underline">
              Panel global →
            </span>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground pt-6">
          Cada local accede a su carta pública en{" "}
          <code className="px-1.5 py-0.5 bg-muted rounded text-foreground">/menu/[slug]</code>
        </p>
      </div>
    </main>
  );
}
