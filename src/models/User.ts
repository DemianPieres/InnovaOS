import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type UserRole = "admin" | "manager" | "cashier" | "waiter" | "kitchen" | "bar";

/**
 * Usuario de un tenant. Cada usuario pertenece a un único tenant y tiene un rol.
 */
export interface IUser extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  branchId?: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  active: boolean;
  currentSessionToken?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
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
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["admin", "manager", "cashier", "waiter", "kitchen", "bar"],
      required: true,
      index: true,
    },
    active: { type: Boolean, default: true },
    currentSessionToken: { type: String },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        delete ret.currentSessionToken;
        return ret;
      },
    },
  }
);

UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, role: 1 });

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);
