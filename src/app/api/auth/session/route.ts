import { NextRequest } from "next/server";
import { requireSystemAuth } from "@/lib/auth/guard";
import { errorResponse, ok } from "@/lib/api/errors";
import { Tenant } from "@/models/Tenant";

export const runtime = "nodejs";

/**
 * Devuelve la sesión actual del usuario logueado (para refrescar UI).
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireSystemAuth(req);
    const tenant = await Tenant.findById(user.tenantId);
    return ok({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId.toString(),
      },
      tenant: tenant
        ? {
            id: tenant._id.toString(),
            name: tenant.name,
            slug: tenant.slug,
            primaryColor: tenant.config.primaryColor,
            currency: tenant.config.currency,
          }
        : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
