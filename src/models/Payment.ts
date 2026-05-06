import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type PaymentMethod =
  | "cash"
  | "credit"
  | "debit"
  | "transfer"
  | "mercadopago"
  | "qr"
  | "other";

export type PaymentStatus = "pending" | "completed" | "refunded" | "cancelled";

/**
 * Pago asociado a un pedido y a un turno de caja.
 */
export interface IPayment extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  branchId?: Types.ObjectId;
  orderId: Types.ObjectId;
  cashRegisterId?: Types.ObjectId;
  method: PaymentMethod;
  amount: number;
  tip: number;
  total: number;
  receivedAmount?: number;
  change?: number;
  status: PaymentStatus;
  reference?: string;
  processedBy: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    cashRegisterId: { type: Schema.Types.ObjectId, ref: "CashRegister", index: true },
    method: {
      type: String,
      enum: ["cash", "credit", "debit", "transfer", "mercadopago", "qr", "other"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    tip: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    receivedAmount: { type: Number, min: 0 },
    change: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ["pending", "completed", "refunded", "cancelled"],
      default: "completed",
      index: true,
    },
    reference: { type: String, trim: true },
    processedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

PaymentSchema.index({ tenantId: 1, createdAt: -1 });
PaymentSchema.index({ tenantId: 1, cashRegisterId: 1 });

export const Payment: Model<IPayment> =
  (mongoose.models.Payment as Model<IPayment>) ||
  mongoose.model<IPayment>("Payment", PaymentSchema);
