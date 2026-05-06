import mongoose, { Document, Model, Schema, Types } from "mongoose";

/**
 * Registro de intentos de login para rate limiting por IP/email.
 * Documentos con TTL de 1 hora para no acumular datos viejos.
 */
export interface ILoginAttempt extends Document {
  _id: Types.ObjectId;
  ipAddress: string;
  email?: string;
  context: "system" | "maxadmin";
  success: boolean;
  createdAt: Date;
}

const LoginAttemptSchema = new Schema<ILoginAttempt>({
  ipAddress: { type: String, required: true, index: true },
  email: { type: String, lowercase: true, trim: true, index: true },
  context: { type: String, enum: ["system", "maxadmin"], required: true },
  success: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: 3600 },
});

LoginAttemptSchema.index({ ipAddress: 1, createdAt: -1 });
LoginAttemptSchema.index({ email: 1, createdAt: -1 });

export const LoginAttempt: Model<ILoginAttempt> =
  (mongoose.models.LoginAttempt as Model<ILoginAttempt>) ||
  mongoose.model<ILoginAttempt>("LoginAttempt", LoginAttemptSchema);
