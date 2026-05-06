import mongoose, { Document, Model, Schema, Types } from "mongoose";

/**
 * Producto del menú: pertenece a un tenant y a una categoría.
 */
export interface IProduct extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  categoryId: Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  available: boolean;
  imageUrl?: string;
  order: number;
  station: "kitchen" | "bar" | "none";
  preparationTime?: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 400 },
    price: { type: Number, required: true, min: 0 },
    cost: { type: Number, min: 0 },
    available: { type: Boolean, default: true, index: true },
    imageUrl: { type: String, trim: true },
    order: { type: Number, default: 0 },
    station: {
      type: String,
      enum: ["kitchen", "bar", "none"],
      default: "none",
    },
    preparationTime: { type: Number, min: 0 },
    tags: [{ type: String, trim: true, lowercase: true }],
  },
  { timestamps: true }
);

ProductSchema.index({ tenantId: 1, categoryId: 1, order: 1 });
ProductSchema.index({ tenantId: 1, available: 1 });
ProductSchema.index({ tenantId: 1, name: "text" });

export const Product: Model<IProduct> =
  (mongoose.models.Product as Model<IProduct>) ||
  mongoose.model<IProduct>("Product", ProductSchema);
