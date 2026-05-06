import { NextRequest } from "next/server";
import { z } from "zod";
import { Customer } from "@/models/Customer";
import { connectDB } from "@/lib/mongodb";
import { requireSystemAuth } from "@/lib/auth/guard";
import {
  Conflict,
  errorResponse,
  ok,
  ValidationError,
} from "@/lib/api/errors";

export const runtime = "nodejs";

const CreateCustomerSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(6).max(20),
  email: z.string().email().max(200).optional(),
  birthDate: z.string().optional(),
  consents: z
    .object({
      whatsapp: z.boolean().optional(),
      email: z.boolean().optional(),
    })
    .optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Lista clientes del tenant con filtros opcionales por segmento o búsqueda.
 */
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireSystemAuth(req);
    const url = req.nextUrl;
    const segment = url.searchParams.get("segment");
    const q = url.searchParams.get("q");

    const filter: Record<string, unknown> = { tenantId };
    if (segment) filter.segment = segment;
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }
    await connectDB();
    const customers = await Customer.find(filter)
      .sort({ totalSpent: -1, createdAt: -1 })
      .limit(200)
      .lean();
    return ok({ customers });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Crea un cliente desde el panel admin.
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await requireSystemAuth(req, {
      roles: ["admin", "manager", "cashier", "waiter"],
    });
    const body = await req.json().catch(() => ({}));
    const parsed = CreateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    const phone = parsed.data.phone.replace(/[^0-9+]/g, "");
    await connectDB();
    const existing = await Customer.findOne({ tenantId, phone });
    if (existing) throw Conflict("Ya existe un cliente con ese teléfono.");
    const customer = await Customer.create({
      tenantId,
      ...parsed.data,
      phone,
      birthDate: parsed.data.birthDate
        ? new Date(parsed.data.birthDate)
        : undefined,
    });
    return ok({ customer }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
