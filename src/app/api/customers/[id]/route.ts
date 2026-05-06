import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { Customer } from "@/models/Customer";
import { connectDB } from "@/lib/mongodb";
import { requireSystemAuth } from "@/lib/auth/guard";
import {
  errorResponse,
  Forbidden,
  NotFound,
  ok,
  ValidationError,
} from "@/lib/api/errors";

export const runtime = "nodejs";

const UpdateCustomerSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().max(200).optional(),
  notes: z.string().max(500).optional(),
  consents: z
    .object({
      whatsapp: z.boolean().optional(),
      email: z.boolean().optional(),
    })
    .optional(),
  active: z.boolean().optional(),
});

interface Params {
  params: { id: string };
}

/**
 * Actualiza un cliente del tenant.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { tenantId } = await requireSystemAuth(req, {
      roles: ["admin", "manager", "cashier", "waiter"],
    });
    if (!Types.ObjectId.isValid(params.id)) throw NotFound();
    const body = await req.json().catch(() => ({}));
    const parsed = UpdateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    await connectDB();
    const customer = await Customer.findById(params.id);
    if (!customer) throw NotFound();
    if (customer.tenantId.toString() !== tenantId.toString()) {
      throw Forbidden("Cliente fuera de tu tenant.");
    }
    Object.assign(customer, parsed.data);
    if (parsed.data.consents) {
      customer.consents = { ...customer.consents, ...parsed.data.consents };
    }
    await customer.save();
    return ok({ customer });
  } catch (error) {
    return errorResponse(error);
  }
}
