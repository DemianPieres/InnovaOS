import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type TableStatus = "free" | "occupied" | "billing" | "reserved" | "disabled";

/**
 * Mesa física del local. Cada mesa tiene un número único por tenant y QR asociado.
 */
export interface ITable extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  branchId?: Types.ObjectId;
  number: number;
  label?: string;
  capacity: number;
  status: TableStatus;
  qrToken: string;
  zone?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TableSchema = new Schema<ITable>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      index: true,
    },
    number: { type: Number, required: true, min: 1 },
    label: { type: String, trim: true },
    capacity: { type: Number, default: 4, min: 1, max: 50 },
    status: {
      type: String,
      enum: ["free", "occupied", "billing", "reserved", "disabled"],
      default: "free",
      index: true,
    },
    qrToken: { type: String, required: true, unique: true, index: true },
    zone: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TableSchema.index({ tenantId: 1, number: 1 }, { unique: true });

export const Table: Model<ITable> =
  (mongoose.models.Table as Model<ITable>) ||
  mongoose.model<ITable>("Table", TableSchema);
