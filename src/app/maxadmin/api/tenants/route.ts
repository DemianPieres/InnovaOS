import { NextRequest } from "next/server";
import { z } from "zod";
import { Tenant } from "@/models/Tenant";
import { Branch } from "@/models/Branch";
import { connectDB } from "@/lib/mongodb";
import { requireMaxAdminAuth } from "@/lib/auth/guard";
import {
  Conflict,
  errorResponse,
  ok,
  ValidationError,
} from "@/lib/api/errors";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

const CreateTenantSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).optional(),
  email: z.string().email().max(200),
  phone: z.string().max(50).optional(),
  address: z.string().max(250).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  plan: z.enum(["basic", "pro", "enterprise"]).optional(),
});

/**
 * Lista todos los tenants registrados (solo MAXADMIN).
 */
export async function GET(req: NextRequest) {
  try {
    await requireMaxAdminAuth(req);
    await connectDB();
    const tenants = await Tenant.find().sort({ createdAt: -1 }).lean();
    return ok({ tenants });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Crea un nuevo tenant junto con su sucursal principal.
 */
export async function POST(req: NextRequest) {
  try {
    await requireMaxAdminAuth(req);
    const body = await req.json().catch(() => ({}));
    const parsed = CreateTenantSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    const data = parsed.data;
    const slug = slugify(data.slug || data.name);
    if (!slug) throw ValidationError("Slug inválido.");

    await connectDB();
    const existing = await Tenant.findOne({ slug });
    if (existing) throw Conflict("Ya existe un tenant con ese slug.");

    const tenant = await Tenant.create({
      name: data.name,
      slug,
      email: data.email,
      phone: data.phone,
      address: data.address,
      plan: data.plan ?? "basic",
      config: {
        primaryColor: data.primaryColor || "#2563eb",
        currency: "ARS",
        timezone: "America/Argentina/Buenos_Aires",
        language: "es-AR",
        loyaltyEnabled: true,
        pointsPerCurrencyUnit: 1,
      },
    });

    await Branch.create({
      tenantId: tenant._id,
      name: "Casa central",
      address: data.address,
      phone: data.phone,
      isMain: true,
      active: true,
    });

    return ok({ tenant }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
