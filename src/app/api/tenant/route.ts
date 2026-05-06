import { NextRequest } from "next/server";
import { z } from "zod";
import { Tenant } from "@/models/Tenant";
import { connectDB } from "@/lib/mongodb";
import { requireSystemAuth } from "@/lib/auth/guard";
import {
  errorResponse,
  NotFound,
  ok,
  ValidationError,
} from "@/lib/api/errors";

export const runtime = "nodejs";

const UpdateTenantSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(250).optional(),
  logoUrl: z.string().url().max(500).optional(),
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

/**
 * Devuelve el tenant del usuario autenticado.
 */
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireSystemAuth(req);
    await connectDB();
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw NotFound();
    return ok({ tenant });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Actualiza el tenant del usuario autenticado (solo admin).
 */
export async function PATCH(req: NextRequest) {
  try {
    const { tenantId } = await requireSystemAuth(req, { roles: ["admin"] });
    const body = await req.json().catch(() => ({}));
    const parsed = UpdateTenantSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    await connectDB();
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw NotFound();
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
