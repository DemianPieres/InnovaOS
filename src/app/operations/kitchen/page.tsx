import { StationBoard } from "@/components/operations/StationBoard";

/**
 * Tablero de cocina: muestra ítems pendientes de la estación "kitchen".
 */
export default function KitchenPage() {
  return (
    <StationBoard
      station="kitchen"
      title="Cocina"
      description="Pedidos activos para preparar."
    />
  );
}
