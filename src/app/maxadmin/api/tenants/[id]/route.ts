import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { Tenant } from "@/models/Tenant";
import { connectDB } from "@/lib/mongodb";
import { requireMaxAdminAuth } from "@/lib/auth/guard";
import {
  errorResponse,
  NotFound,
  ok,
  ValidationError,
} from "@/lib/api/errors";

export const runtime = "nodejs";

const UpdateTenantSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().max(200).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(250).optional(),
  active: z.boolean().optional(),
  plan: z.enum(["basic", "pro", "enterprise"]).optional(),
  config: z
    .object({
      primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      currency: z.string().max(8).optional(),
      timezone: z.string().max(64).optional(),
      language: z.string().max(16).optional(),
      loyaltyEnabled: z.boolean().optional(),
      pointsPerCurrencyUnit: z.number().min(0).max(1000).optional(),
    })
    .partial()
    .optional(),
});

interface Params {
  params: { id: string };
}

/**
 * Devuelve un tenant por ID (solo MAXADMIN).
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireMaxAdminAuth(req);
    if (!Types.ObjectId.isValid(params.id)) throw NotFound("Tenant no encontrado.");
    await connectDB();
    const tenant = await Tenant.findById(params.id);
    if (!tenant) throw NotFound("Tenant no encontrado.");
    return ok({ tenant });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Actualiza un tenant (solo MAXADMIN).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireMaxAdminAuth(req);
    if (!Types.ObjectId.isValid(params.id)) throw NotFound("Tenant no encontrado.");
    const body = await req.json().catch(() => ({}));
    const parsed = UpdateTenantSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    await connectDB();
    const tenant = await Tenant.findById(params.id);
    if (!tenant) throw NotFound("Tenant no encontrado.");

    Object.assign(tenant, parsed.data);
    if (parsed.data.config) {
      tenant.config = { ...tenant.config, ...parsed.data.config };
    }
    await tenant.save();
    return ok({ tenant });
  } catch (error) {
    return errorResponse(error);
  }
}
