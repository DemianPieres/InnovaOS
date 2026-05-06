import { NextRequest } from "next/server";
import { z } from "zod";
import { CashRegister } from "@/models/CashRegister";
import { connectDB } from "@/lib/mongodb";
import { requireSystemAuth } from "@/lib/auth/guard";
import {
  Conflict,
  errorResponse,
  ok,
  ValidationError,
} from "@/lib/api/errors";

export const runtime = "nodejs";

const OpenCashSchema = z.object({
  openingAmount: z.number().min(0).max(100_000_000),
  notes: z.string().max(500).optional(),
});

/**
 * Abre una nueva caja. Falla si ya hay una abierta para el tenant.
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId, user } = await requireSystemAuth(req, {
      roles: ["admin", "manager", "cashier"],
    });
    const body = await req.json().catch(() => ({}));
    const parsed = OpenCashSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    await connectDB();
    const existing = await CashRegister.findOne({ tenantId, status: "open" });
    if (existing) throw Conflict("Ya hay una caja abierta. Cerrala primero.");

    const register = await CashRegister.create({
      tenantId,
      openedBy: user._id,
      openingAmount: parsed.data.openingAmount,
      notes: parsed.data.notes,
      status: "open",
      openedAt: new Date(),
    });
    return ok({ register }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
