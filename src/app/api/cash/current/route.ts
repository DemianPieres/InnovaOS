import { NextRequest } from "next/server";
import { CashRegister } from "@/models/CashRegister";
import { CashTransaction } from "@/models/CashTransaction";
import { Payment } from "@/models/Payment";
import { connectDB } from "@/lib/mongodb";
import { requireSystemAuth } from "@/lib/auth/guard";
import { errorResponse, ok } from "@/lib/api/errors";

export const runtime = "nodejs";

/**
 * Devuelve la caja abierta del tenant (si existe), con sus transacciones y pagos.
 */
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireSystemAuth(req);
    await connectDB();
    const register = await CashRegister.findOne({ tenantId, status: "open" });
    if (!register) return ok({ register: null, transactions: [], payments: [] });
    const [transactions, payments] = await Promise.all([
      CashTransaction.find({ tenantId, cashRegisterId: register._id })
        .sort({ createdAt: -1 })
        .lean(),
      Payment.find({ tenantId, cashRegisterId: register._id })
        .sort({ createdAt: -1 })
        .lean(),
    ]);
    return ok({ register, transactions, payments });
  } catch (error) {
    return errorResponse(error);
  }
}
