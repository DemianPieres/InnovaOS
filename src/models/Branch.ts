import mongoose, { Document, Model, Schema, Types } from "mongoose";

/**
 * Sucursal: cada tenant puede tener N sucursales.
 */
export interface IBranch extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  name: string;
  address?: string;
  phone?: string;
  active: boolean;
  isMain: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    active: { type: Boolean, default: true },
    isMain: { type: Boolean, default: false },
  },
  { timestamps: true }
);

BranchSchema.index({ tenantId: 1, name: 1 });

export const Branch: Model<IBranch> =
  (mongoose.models.Branch as Model<IBranch>) ||
  mongoose.model<IBranch>("Branch", BranchSchema);
