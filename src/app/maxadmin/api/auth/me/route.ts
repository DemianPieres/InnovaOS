import { NextRequest } from "next/server";
import { requireMaxAdminAuth } from "@/lib/auth/guard";
import { errorResponse, ok } from "@/lib/api/errors";

export const runtime = "nodejs";

/**
 * Devuelve los datos del MAXADMIN autenticado.
 */
export async function GET(req: NextRequest) {
  try {
    const { admin } = await requireMaxAdminAuth(req);
    return ok({
      admin: {
        id: admin._id.toString(),
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
