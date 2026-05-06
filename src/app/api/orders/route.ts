import { NextRequest } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { Order, type IOrderItem } from "@/models/Order";
import { Product } from "@/models/Product";
import { connectDB } from "@/lib/mongodb";
import { requireSystemAuth } from "@/lib/auth/guard";
import {
  errorResponse,
  ok,
  ValidationError,
} from "@/lib/api/errors";
import { broadcastTenantEvent } from "@/lib/realtime/broadcast";

export const runtime = "nodejs";

const StatusFilter = z.enum([
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "served",
  "paid",
  "cancelled",
]);

const CreateOrderSchema = z.object({
  tableId: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().max(120).optional(),
  source: z.enum(["customer-qr", "waiter", "counter"]).default("waiter"),
  notes: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1).max(99),
        notes: z.string().max(250).optional(),
      })
    )
    .min(1)
    .max(50),
});

/**
 * Lista pedidos del tenant. Permite filtrar por status, mesa o rango de fechas.
 */
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireSystemAuth(req);
    const url = req.nextUrl;
    const statusParam = url.searchParams.get("status");
    const tableId = url.searchParams.get("tableId");
    const station = url.searchParams.get("station");
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);

    const filter: Record<string, unknown> = { tenantId };
    if (statusParam) {
      const statuses = statusParam.split(",").map((s) => s.trim());
      const validated = statuses.filter((s): s is z.infer<typeof StatusFilter> =>
        StatusFilter.safeParse(s).success
      );
      if (validated.length > 0) filter.status = { $in: validated };
    }
    if (tableId && Types.ObjectId.isValid(tableId)) {
      filter.tableId = tableId;
    }
    if (station === "kitchen" || station === "bar") {
      filter["items.station"] = station;
    }

    await connectDB();
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return ok({ orders });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Crea un pedido manual (mozo o caja). Valida productos del tenant.
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId, user } = await requireSystemAuth(req, {
      roles: ["admin", "manager", "cashier", "waiter"],
    });
    const body = await req.json().catch(() => ({}));
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    const data = parsed.data;
    const productIds = data.items.map((i) => i.productId);
    if (productIds.some((id) => !Types.ObjectId.isValid(id))) {
      throw ValidationError("ProductId inválido.");
    }
    await connectDB();
    const products = await Product.find({
      _id: { $in: productIds },
      tenantId,
      available: true,
    });
    if (products.length !== productIds.length) {
      throw ValidationError("Algún producto no pertenece al tenant o no está disponible.");
    }
    const productsById = new Map(products.map((p) => [p._id.toString(), p]));
    const items: IOrderItem[] = data.items.map((i) => {
      const p = productsById.get(i.productId);
      if (!p) throw ValidationError("Producto no encontrado.");
      return {
        productId: p._id,
        name: p.name,
        price: p.price,
        quantity: i.quantity,
        notes: i.notes,
        station: p.station,
        status: "pending",
      };
    });
    const subtotal = items.reduce((acc, it) => acc + it.price * it.quantity, 0);

    const order = await Order.create({
      tenantId,
      tableId:
        data.tableId && Types.ObjectId.isValid(data.tableId)
          ? data.tableId
          : undefined,
      customerId:
        data.customerId && Types.ObjectId.isValid(data.customerId)
          ? data.customerId
          : undefined,
      customerName: data.customerName,
      source: data.source,
      notes: data.notes,
      items,
      subtotal,
      total: subtotal,
      status: "confirmed",
    });

    broadcastTenantEvent(tenantId.toString(), {
      type: "order:new",
      orderId: order._id.toString(),
      tableId: order.tableId?.toString(),
      total: order.total,
      createdBy: user._id.toString(),
    });

    return ok({ order }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
