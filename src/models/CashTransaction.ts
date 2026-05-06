import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type CashTransactionType = "income" | "expense" | "withdraw" | "deposit";

/**
 * Movimiento de caja: ingresos, gastos, retiros, depósitos.
 */
export interface ICashTransaction extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  cashRegisterId: Types.ObjectId;
  type: CashTransactionType;
  amount: number;
  description: string;
  performedBy: Types.ObjectId;
  paymentId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CashTransactionSchema = new Schema<ICashTransaction>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    cashRegisterId: {
      type: Schema.Types.ObjectId,
      ref: "CashRegister",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["income", "expense", "withdraw", "deposit"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true, maxlength: 250 },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
  },
  { timestamps: true }
);

CashTransactionSchema.index({ tenantId: 1, cashRegisterId: 1, createdAt: -1 });

export const CashTransaction: Model<ICashTransaction> =
  (mongoose.models.CashTransaction as Model<ICashTransaction>) ||
  mongoose.model<ICashTransaction>("CashTransaction", CashTransactionSchema);
