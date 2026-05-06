import { NextRequest } from "next/server";
import { z } from "zod";
import { CashRegister } from "@/models/CashRegister";
import { CashTransaction } from "@/models/CashTransaction";
import { Payment } from "@/models/Payment";
import { connectDB } from "@/lib/mongodb";
import { requireSystemAuth } from "@/lib/auth/guard";
import {
  errorResponse,
  NotFound,
  ok,
  ValidationError,
} from "@/lib/api/errors";

export const runtime = "nodejs";

const CloseCashSchema = z.object({
  closingAmount: z.number().min(0).max(100_000_000),
  billsCount: z.record(z.string(), z.number().int().min(0)).optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Cierra la caja abierta del tenant calculando el monto esperado
 * (apertura + ingresos cash − retiros) y la diferencia con el conteo real.
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId, user } = await requireSystemAuth(req, {
      roles: ["admin", "manager", "cashier"],
    });
    const body = await req.json().catch(() => ({}));
    const parsed = CloseCashSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    await connectDB();
    const register = await CashRegister.findOne({ tenantId, status: "open" });
    if (!register) throw NotFound("No hay caja abierta.");

    const [cashPayments, txs] = await Promise.all([
      Payment.find({
        tenantId,
        cashRegisterId: register._id,
        method: "cash",
        status: "completed",
      }).select("total tip"),
      CashTransaction.find({
        tenantId,
        cashRegisterId: register._id,
      }).select("type amount"),
    ]);

    const cashIncome = cashPayments.reduce((acc, p) => acc + p.total, 0);
    let txDelta = 0;
    for (const tx of txs) {
      if (tx.type === "income" || tx.type === "deposit") txDelta += tx.amount;
      if (tx.type === "expense" || tx.type === "withdraw") txDelta -= tx.amount;
    }
    const expected = register.openingAmount + cashIncome + txDelta;
    register.closingAmount = parsed.data.closingAmount;
    register.expectedAmount = expected;
    register.difference = parsed.data.closingAmount - expected;
    register.billsCount = parsed.data.billsCount || {};
    register.notes = [register.notes, parsed.data.notes].filter(Boolean).join(" | ");
    register.closedBy = user._id;
    register.closedAt = new Date();
    register.status = "closed";
    await register.save();

    return ok({ register });
  } catch (error) {
    return errorResponse(error);
  }
}
