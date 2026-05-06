import mongoose, { Document, Model, Schema, Types } from "mongoose";

/**
 * MAXADMIN: superusuario global del sistema. Independiente de cualquier tenant.
 * Solo puede operar bajo /maxadmin/* y tiene su propio JWT secret.
 */
export interface IMaxAdmin extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  active: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MaxAdminSchema = new Schema<IMaxAdmin>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

export const MaxAdmin: Model<IMaxAdmin> =
  (mongoose.models.MaxAdmin as Model<IMaxAdmin>) ||
  mongoose.model<IMaxAdmin>("MaxAdmin", MaxAdminSchema);
