import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { User } from "@/models/User";
import { connectDB } from "@/lib/mongodb";
import { requireMaxAdminAuth } from "@/lib/auth/guard";
import { hashPassword, isStrongPassword } from "@/lib/auth/password";
import {
  errorResponse,
  NotFound,
  ok,
  ValidationError,
} from "@/lib/api/errors";

export const runtime = "nodejs";

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  role: z.enum(["admin", "manager", "cashier", "waiter", "kitchen", "bar"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).max(200).optional(),
});

interface Params {
  params: { id: string };
}

/**
 * Actualiza un usuario (solo MAXADMIN).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireMaxAdminAuth(req);
    if (!Types.ObjectId.isValid(params.id)) throw NotFound("Usuario no encontrado.");
    const body = await req.json().catch(() => ({}));
    const parsed = UpdateUserSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    await connectDB();
    const user = await User.findById(params.id);
    if (!user) throw NotFound("Usuario no encontrado.");

    if (parsed.data.name !== undefined) user.name = parsed.data.name;
    if (parsed.data.role !== undefined) user.role = parsed.data.role;
    if (parsed.data.active !== undefined) user.active = parsed.data.active;
    if (parsed.data.password) {
      if (!isStrongPassword(parsed.data.password)) {
        throw ValidationError(
          "El password debe tener mínimo 8 caracteres con mayúscula, minúscula y dígito."
        );
      }
      user.passwordHash = await hashPassword(parsed.data.password);
      user.currentSessionToken = undefined;
    }
    await user.save();
    return ok({ user });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Desactiva un usuario (soft delete).
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await requireMaxAdminAuth(req);
    if (!Types.ObjectId.isValid(params.id)) throw NotFound("Usuario no encontrado.");
    await connectDB();
    const user = await User.findById(params.id);
    if (!user) throw NotFound("Usuario no encontrado.");
    user.active = false;
    user.currentSessionToken = undefined;
    await user.save();
    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
