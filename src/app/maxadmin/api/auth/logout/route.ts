import { clearMaxAdminCookie } from "@/lib/auth/cookies";
import { errorResponse, ok } from "@/lib/api/errors";

export const runtime = "nodejs";

/**
 * Cierra la sesión del MAXADMIN limpiando la cookie.
 */
export async function POST() {
  try {
    clearMaxAdminCookie();
    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
