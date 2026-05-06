import { NextRequest } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { Tenant } from "@/models/Tenant";
import { Table } from "@/models/Table";
import { Product } from "@/models/Product";
import { Order, type IOrderItem } from "@/models/Order";
import { Customer } from "@/models/Customer";
import { connectDB } from "@/lib/mongodb";
import {
  errorResponse,
  NotFound,
  ok,
  ValidationError,
} from "@/lib/api/errors";
import { broadcastTenantEvent } from "@/lib/realtime/broadcast";

export const runtime = "nodejs";

const PublicOrderSchema = z.object({
  tenantSlug: z.string().min(1).max(120),
  tableNumber: z.number().int().min(1).max(9999),
  qrToken: z.string().min(1).max(80),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
        notes: z.string().max(250).optional(),
      })
    )
    .min(1)
    .max(50),
  customer: z
    .object({
      name: z.string().min(1).max(120),
      phone: z.string().min(6).max(20),
      consentWhatsapp: z.boolean().optional(),
    })
    .optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Endpoint público para crear un pedido desde la carta (cliente final).
 * Valida tenant, mesa con su qrToken, productos disponibles del mismo tenant.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = PublicOrderSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Pedido inválido.", parsed.error.flatten());
    }
    const data = parsed.data;
    await connectDB();
    const tenant = await Tenant.findOne({
      slug: data.tenantSlug,
      active: true,
    });
    if (!tenant) throw NotFound("Local no encontrado.");

    const table = await Table.findOne({
      tenantId: tenant._id,
      number: data.tableNumber,
      qrToken: data.qrToken,
      active: true,
    });
    if (!table) throw ValidationError("Mesa o código QR inválido.");

    const productIds = data.items
      .map((i) => i.productId)
      .filter((id) => Types.ObjectId.isValid(id));
    if (productIds.length !== data.items.length) {
      throw ValidationError("Hay productos con ID inválido.");
    }

    const products = await Product.find({
      _id: { $in: productIds },
      tenantId: tenant._id,
      available: true,
    });
    const productsById = new Map(products.map((p) => [p._id.toString(), p]));
    if (productsById.size !== productIds.length) {
      throw ValidationError("Algún producto no existe o no está disponible.");
    }

    const orderItems: IOrderItem[] = data.items.map((i) => {
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

    const subtotal = orderItems.reduce((acc, it) => acc + it.price * it.quantity, 0);

    let customerId: Types.ObjectId | undefined;
    let customerName: string | undefined;
    if (data.customer) {
      const phone = data.customer.phone.replace(/[^0-9+]/g, "");
      let customer = await Customer.findOne({
        tenantId: tenant._id,
        phone,
      });
      if (!customer) {
        customer = await Customer.create({
          tenantId: tenant._id,
          name: data.customer.name,
          phone,
          consents: { whatsapp: !!data.customer.consentWhatsapp, email: false },
        });
      }
      customerId = customer._id;
      customerName = customer.name;
    }

    const order = await Order.create({
      tenantId: tenant._id,
      tableId: table._id,
      tableNumber: table.number,
      customerId,
      customerName,
      items: orderItems,
      subtotal,
      discount: 0,
      tip: 0,
      total: subtotal,
      status: "pending",
      source: "customer-qr",
      notes: data.notes,
    });

    if (table.status === "free") {
      table.status = "occupied";
      await table.save();
    }

    broadcastTenantEvent(tenant._id.toString(), {
      type: "order:new",
      orderId: order._id.toString(),
      tableNumber: table.number,
      total: order.total,
    });

    return ok(
      {
        orderId: order._id.toString(),
        status: order.status,
        total: order.total,
      },
      201
    );
  } catch (error) {
    return errorResponse(error);
  }
}
