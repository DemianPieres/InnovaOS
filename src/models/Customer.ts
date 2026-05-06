import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type CustomerLevel = "bronce" | "plata" | "oro" | "platino";
export type CustomerSegment = "nuevo" | "ocasional" | "habitual" | "vip" | "inactivo";

/**
 * Cliente final del local. Se registra desde la carta y acumula puntos / niveles.
 */
export interface ICustomer extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  birthDate?: Date;
  points: number;
  level: CustomerLevel;
  segment: CustomerSegment;
  totalSpent: number;
  visitsCount: number;
  lastVisitAt?: Date;
  consents: {
    whatsapp: boolean;
    email: boolean;
  };
  notes?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, lowercase: true, trim: true },
    birthDate: { type: Date },
    points: { type: Number, default: 0, min: 0, index: true },
    level: {
      type: String,
      enum: ["bronce", "plata", "oro", "platino"],
      default: "bronce",
      index: true,
    },
    segment: {
      type: String,
      enum: ["nuevo", "ocasional", "habitual", "vip", "inactivo"],
      default: "nuevo",
      index: true,
    },
    totalSpent: { type: Number, default: 0, min: 0 },
    visitsCount: { type: Number, default: 0, min: 0 },
    lastVisitAt: { type: Date },
    consents: {
      whatsapp: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
    },
    notes: { type: String, trim: true, maxlength: 500 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CustomerSchema.index({ tenantId: 1, phone: 1 }, { unique: true });
CustomerSchema.index({ tenantId: 1, level: 1 });
CustomerSchema.index({ tenantId: 1, segment: 1 });

export const Customer: Model<ICustomer> =
  (mongoose.models.Customer as Model<ICustomer>) ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);
