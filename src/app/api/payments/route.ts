import { NextRequest } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { Payment } from "@/models/Payment";
import { Order } from "@/models/Order";
import { CashRegister } from "@/models/CashRegister";
import { Customer } from "@/models/Customer";
import { Tenant } from "@/models/Tenant";
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

const CreatePaymentSchema = z.object({
  orderId: z.string(),
  method: z.enum(["cash", "credit", "debit", "transfer", "mercadopago", "qr", "other"]),
  amount: z.number().min(0),
  tip: z.number().min(0).optional(),
  receivedAmount: z.number().min(0).optional(),
  reference: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Lista pagos del tenant filtrados por caja, fecha o método.
 */
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireSystemAuth(req);
    const url = req.nextUrl;
    const cashRegisterId = url.searchParams.get("cashRegisterId");
    const filter: Record<string, unknown> = { tenantId };
    if (cashRegisterId && Types.ObjectId.isValid(cashRegisterId)) {
      filter.cashRegisterId = cashRegisterId;
    }
    await connectDB();
    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return ok({ payments });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Procesa un pago de un pedido. Si no hay caja abierta, falla para método cash.
 * Marca el pedido como pagado y, si corresponde, suma puntos al cliente.
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId, user } = await requireSystemAuth(req, {
      roles: ["admin", "manager", "cashier", "waiter"],
    });
    const body = await req.json().catch(() => ({}));
    const parsed = CreatePaymentSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    if (!Types.ObjectId.isValid(parsed.data.orderId)) {
      throw ValidationError("orderId inválido.");
    }
    await connectDB();
    const order = await Order.findById(parsed.data.orderId);
    if (!order) throw NotFound("Pedido no encontrado.");
    if (order.tenantId.toString() !== tenantId.toString()) {
      throw Forbidden("Pedido fuera de tu tenant.");
    }
    if (order.status === "paid") {
      throw ValidationError("El pedido ya está pagado.");
    }
    if (order.status === "cancelled") {
      throw ValidationError("El pedido fue cancelado.");
    }

    const register = await CashRegister.findOne({ tenantId, status: "open" });
    if (parsed.data.method === "cash" && !register) {
      throw ValidationError("Necesitás abrir caja para registrar pagos en efectivo.");
    }

    const tip = parsed.data.tip ?? 0;
    const total = parsed.data.amount + tip;
    const change =
      parsed.data.method === "cash" && parsed.data.receivedAmount
        ? Math.max(0, parsed.data.receivedAmount - total)
        : undefined;

    const payment = await Payment.create({
      tenantId,
      orderId: order._id,
      cashRegisterId: register?._id,
      method: parsed.data.method,
      amount: parsed.data.amount,
      tip,
      total,
      receivedAmount: parsed.data.receivedAmount,
      change,
      status: "completed",
      reference: parsed.data.reference,
      notes: parsed.data.notes,
      processedBy: user._id,
    });

    order.tip = tip;
    order.total = total;
    order.status = "paid";
    order.paidAt = new Date();
    order.paymentId = payment._id;
    await order.save();

    if (order.customerId) {
      const tenant = await Tenant.findById(tenantId);
      if (tenant?.config.loyaltyEnabled) {
        const points = Math.floor(
          (parsed.data.amount * (tenant.config.pointsPerCurrencyUnit || 0)) / 100
        );
        await Customer.updateOne(
          { _id: order.customerId, tenantId },
          {
            $inc: {
              points,
              totalSpent: parsed.data.amount,
              visitsCount: 1,
            },
            $set: { lastVisitAt: new Date() },
          }
        );
      }
    }

    broadcastTenantEvent(tenantId.toString(), {
      type: "order:update",
      orderId: order._id.toString(),
      status: "paid",
    });

    return ok({ payment, order }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
