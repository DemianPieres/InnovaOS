import { StationBoard } from "@/components/operations/StationBoard";

/**
 * Tablero de barra: muestra ítems pendientes de la estación "bar".
 */
export default function BarPage() {
  return (
    <StationBoard
      station="bar"
      title="Barra"
      description="Bebidas y tragos pendientes."
    />
  );
}
