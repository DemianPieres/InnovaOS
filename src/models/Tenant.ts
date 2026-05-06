import mongoose, { Document, Model, Schema, Types } from "mongoose";

/**
 * Configuración visual y operativa de un tenant (local de gastronomía).
 */
export interface ITenantConfig {
  primaryColor: string;
  currency: string;
  timezone: string;
  language: string;
  loyaltyEnabled: boolean;
  pointsPerCurrencyUnit: number;
}

export interface ITenant extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  active: boolean;
  config: ITenantConfig;
  plan: "basic" | "pro" | "enterprise";
  createdAt: Date;
  updatedAt: Date;
}

const TenantConfigSchema = new Schema<ITenantConfig>(
  {
    primaryColor: { type: String, default: "#2563eb" },
    currency: { type: String, default: "ARS" },
    timezone: { type: String, default: "America/Argentina/Buenos_Aires" },
    language: { type: String, default: "es-AR" },
    loyaltyEnabled: { type: Boolean, default: true },
    pointsPerCurrencyUnit: { type: Number, default: 1 },
  },
  { _id: false }
);

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9-]+$/,
      index: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
    plan: {
      type: String,
      enum: ["basic", "pro", "enterprise"],
      default: "basic",
    },
    config: { type: TenantConfigSchema, default: () => ({}) },
  },
  { timestamps: true }
);

TenantSchema.index({ slug: 1 }, { unique: true });

export const Tenant: Model<ITenant> =
  (mongoose.models.Tenant as Model<ITenant>) ||
  mongoose.model<ITenant>("Tenant", TenantSchema);
