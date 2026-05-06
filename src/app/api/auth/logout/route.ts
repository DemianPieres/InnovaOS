import { NextRequest } from "next/server";
import { clearSystemCookies, SYSTEM_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { verifySystemToken } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { errorResponse, ok } from "@/lib/api/errors";

export const runtime = "nodejs";

/**
 * Cierra la sesión actual: limpia cookies y revoca el sessionToken activo.
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SYSTEM_TOKEN_COOKIE)?.value;
    if (token) {
      const payload = verifySystemToken(token);
      if (payload) {
        await connectDB();
        await User.updateOne(
          { _id: payload.uid, currentSessionToken: payload.sid },
          { $unset: { currentSessionToken: "" } }
        );
      }
    }
    clearSystemCookies();
    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
