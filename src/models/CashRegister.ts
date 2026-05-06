import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type CashStatus = "open" | "closed";

/**
 * Turno de caja. Se abre con un monto inicial y se cierra con conteo final.
 */
export interface ICashRegister extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  branchId?: Types.ObjectId;
  openedBy: Types.ObjectId;
  closedBy?: Types.ObjectId;
  openingAmount: number;
  closingAmount?: number;
  expectedAmount?: number;
  difference?: number;
  status: CashStatus;
  openedAt: Date;
  closedAt?: Date;
  notes?: string;
  billsCount?: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const CashRegisterSchema = new Schema<ICashRegister>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
    openedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
    openingAmount: { type: Number, required: true, min: 0 },
    closingAmount: { type: Number, min: 0 },
    expectedAmount: { type: Number, min: 0 },
    difference: { type: Number },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
      index: true,
    },
    openedAt: { type: Date, default: Date.now, index: true },
    closedAt: { type: Date },
    notes: { type: String, trim: true, maxlength: 500 },
    billsCount: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

CashRegisterSchema.index({ tenantId: 1, status: 1, openedAt: -1 });

export const CashRegister: Model<ICashRegister> =
  (mongoose.models.CashRegister as Model<ICashRegister>) ||
  mongoose.model<ICashRegister>("CashRegister", CashRegisterSchema);
