import { MenuClient } from "@/components/menu/MenuClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { slug: string };
  searchParams: { table?: string; t?: string };
}

/**
 * Página pública de la carta del cliente. Carga datos via API y delega al
 * componente cliente que maneja carrito y envío de pedidos.
 */
export default function MenuPage({ params, searchParams }: PageProps) {
  return (
    <MenuClient
      slug={params.slug}
      tableNumber={searchParams.table}
      qrToken={searchParams.t}
    />
  );
}
