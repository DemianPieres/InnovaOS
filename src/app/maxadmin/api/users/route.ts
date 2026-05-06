import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { User } from "@/models/User";
import { Tenant } from "@/models/Tenant";
import { connectDB } from "@/lib/mongodb";
import { requireMaxAdminAuth } from "@/lib/auth/guard";
import { hashPassword, isStrongPassword } from "@/lib/auth/password";
import {
  Conflict,
  errorResponse,
  NotFound,
  ok,
  ValidationError,
} from "@/lib/api/errors";

export const runtime = "nodejs";

const CreateUserSchema = z.object({
  tenantId: z.string().min(1),
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(120),
  role: z.enum(["admin", "manager", "cashier", "waiter", "kitchen", "bar"]),
});

/**
 * Lista usuarios de un tenant (filtro obligatorio por tenantId).
 */
export async function GET(req: NextRequest) {
  try {
    await requireMaxAdminAuth(req);
    const tenantId = req.nextUrl.searchParams.get("tenantId");
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      throw ValidationError("tenantId requerido.");
    }
    await connectDB();
    const users = await User.find({ tenantId }).sort({ createdAt: -1 }).lean();
    return ok({ users });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Crea un usuario para un tenant específico (solo MAXADMIN).
 */
export async function POST(req: NextRequest) {
  try {
    await requireMaxAdminAuth(req);
    const body = await req.json().catch(() => ({}));
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    const data = parsed.data;
    if (!isStrongPassword(data.password)) {
      throw ValidationError(
        "El password debe tener mínimo 8 caracteres con mayúscula, minúscula y dígito."
      );
    }
    if (!Types.ObjectId.isValid(data.tenantId)) {
      throw ValidationError("tenantId inválido.");
    }
    await connectDB();
    const tenant = await Tenant.findById(data.tenantId);
    if (!tenant) throw NotFound("Tenant no encontrado.");

    const existing = await User.findOne({
      tenantId: tenant._id,
      email: data.email.toLowerCase(),
    });
    if (existing) throw Conflict("Ya existe un usuario con ese email en este tenant.");

    const passwordHash = await hashPassword(data.password);
    const user = await User.create({
      tenantId: tenant._id,
      email: data.email.toLowerCase(),
      passwordHash,
      name: data.name,
      role: data.role,
      active: true,
    });

    return ok({ user }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
