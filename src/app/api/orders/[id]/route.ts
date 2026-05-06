import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { Order } from "@/models/Order";
import { Table } from "@/models/Table";
import { connectDB } from "@/lib/mongodb";
import { requireSystemAuth } from "@/lib/auth/guard";
import {
  errorResponse,
  Forbidden,
  NotFound,
  ok,
  ValidationError,
} from "@/lib/api/errors";
import { broadcastTenantEvent } from "@/lib/realtime/broadcast";

export const runtime = "nodejs";

const UpdateOrderSchema = z.object({
  status: z
    .enum([
      "pending",
      "confirmed",
      "preparing",
      "ready",
      "served",
      "paid",
      "cancelled",
    ])
    .optional(),
  notes: z.string().max(500).optional(),
  discount: z.number().min(0).optional(),
  tip: z.number().min(0).optional(),
  itemUpdate: z
    .object({
      itemId: z.string(),
      status: z.enum(["pending", "preparing", "ready", "served", "cancelled"]),
    })
    .optional(),
});

interface Params {
  params: { id: string };
}

/**
 * Devuelve un pedido específico del tenant.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { tenantId } = await requireSystemAuth(req);
    if (!Types.ObjectId.isValid(params.id)) throw NotFound();
    await connectDB();
    const order = await Order.findById(params.id).lean();
    if (!order) throw NotFound();
    if (order.tenantId.toString() !== tenantId.toString()) {
      throw Forbidden("Pedido fuera de tu tenant.");
    }
    return ok({ order });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Actualiza el estado, items o totales de un pedido.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { tenantId, user } = await requireSystemAuth(req);
    if (!Types.ObjectId.isValid(params.id)) throw NotFound();
    const body = await req.json().catch(() => ({}));
    const parsed = UpdateOrderSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    await connectDB();
    const order = await Order.findById(params.id);
    if (!order) throw NotFound();
    if (order.tenantId.toString() !== tenantId.toString()) {
      throw Forbidden("Pedido fuera de tu tenant.");
    }

    if (parsed.data.status) {
      order.status = parsed.data.status;
    }
    if (parsed.data.notes !== undefined) order.notes = parsed.data.notes;
    if (parsed.data.discount !== undefined) order.discount = parsed.data.discount;
    if (parsed.data.tip !== undefined) order.tip = parsed.data.tip;

    if (parsed.data.itemUpdate) {
      const target = order.items.find(
        (it) => it._id?.toString() === parsed.data.itemUpdate?.itemId
      );
      if (!target) throw NotFound("Ítem no encontrado.");
      target.status = parsed.data.itemUpdate.status;
    }

    order.total = Math.max(
      0,
      order.subtotal - (order.discount || 0) + (order.tip || 0)
    );

    await order.save();

    if (order.status === "paid" && order.tableId) {
      await Table.updateOne(
        { _id: order.tableId, tenantId },
        { $set: { status: "free" } }
      );
    }

    broadcastTenantEvent(tenantId.toString(), {
      type: "order:update",
      orderId: order._id.toString(),
      status: order.status,
      changedBy: user._id.toString(),
    });

    return ok({ order });
  } catch (error) {
    return errorResponse(error);
  }
}
