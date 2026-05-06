import { NextRequest } from "next/server";
import { z } from "zod";
import { CashRegister } from "@/models/CashRegister";
import { CashTransaction } from "@/models/CashTransaction";
import { connectDB } from "@/lib/mongodb";
import { requireSystemAuth } from "@/lib/auth/guard";
import {
  errorResponse,
  NotFound,
  ok,
  ValidationError,
} from "@/lib/api/errors";

export const runtime = "nodejs";

const CreateTxSchema = z.object({
  type: z.enum(["income", "expense", "withdraw", "deposit"]),
  amount: z.number().min(0).max(100_000_000),
  description: z.string().min(1).max(250),
});

/**
 * Crea un movimiento manual de caja (ingreso, gasto, retiro, depósito).
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId, user } = await requireSystemAuth(req, {
      roles: ["admin", "manager", "cashier"],
    });
    const body = await req.json().catch(() => ({}));
    const parsed = CreateTxSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    await connectDB();
    const register = await CashRegister.findOne({ tenantId, status: "open" });
    if (!register) throw NotFound("No hay caja abierta.");

    const tx = await CashTransaction.create({
      tenantId,
      cashRegisterId: register._id,
      type: parsed.data.type,
      amount: parsed.data.amount,
      description: parsed.data.description,
      performedBy: user._id,
    });
    return ok({ transaction: tx }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
