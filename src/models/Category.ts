import mongoose, { Document, Model, Schema, Types } from "mongoose";

/**
 * Categoría de productos dentro de un tenant (ej: "Cafés", "Postres").
 */
export interface ICategory extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  name: string;
  description?: string;
  order: number;
  station: "kitchen" | "bar" | "none";
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 250 },
    order: { type: Number, default: 0, index: true },
    station: {
      type: String,
      enum: ["kitchen", "bar", "none"],
      default: "none",
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CategorySchema.index({ tenantId: 1, name: 1 }, { unique: true });
CategorySchema.index({ tenantId: 1, order: 1 });

export const Category: Model<ICategory> =
  (mongoose.models.Category as Model<ICategory>) ||
  mongoose.model<ICategory>("Category", CategorySchema);
