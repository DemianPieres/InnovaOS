import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Tenant } from "@/models/Tenant";
import { verifyPassword } from "@/lib/auth/password";
import {
  generateSessionToken,
  signRefreshToken,
  signSystemToken,
} from "@/lib/auth/jwt";
import { setSystemCookies } from "@/lib/auth/cookies";
import {
  enforceLoginRateLimit,
  recordLoginAttempt,
} from "@/lib/api/rate-limit";
import {
  errorResponse,
  ok,
  Unauthorized,
  ValidationError,
} from "@/lib/api/errors";
import { sleep } from "@/lib/utils";

export const runtime = "nodejs";

const LoginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
  tenantSlug: z.string().min(1).max(120).optional(),
});

/**
 * Login del sistema. Devuelve token JWT en cookie httpOnly y rota sessionToken
 * para invalidar sesiones previas (sesión única por usuario).
 */
export async function POST(req: NextRequest) {
  try {
    const { ipAddress } = await enforceLoginRateLimit(req, "system");
    const body = await req.json().catch(() => ({}));
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos de login inválidos.", parsed.error.flatten());
    }
    const { email, password, tenantSlug } = parsed.data;

    await connectDB();

    let tenantFilter: Record<string, unknown> = {};
    if (tenantSlug) {
      const tenant = await Tenant.findOne({ slug: tenantSlug, active: true });
      if (!tenant) {
        await recordLoginAttempt({ ipAddress, email, context: "system", success: false });
        await sleep(400);
        throw Unauthorized("Credenciales inválidas.");
      }
      tenantFilter = { tenantId: tenant._id };
    }

    const user = await User.findOne({ email, ...tenantFilter });
    if (!user || !user.active) {
      await recordLoginAttempt({ ipAddress, email, context: "system", success: false });
      await sleep(400);
      throw Unauthorized("Credenciales inválidas.");
    }

    const passwordOk = await verifyPassword(password, user.passwordHash);
    if (!passwordOk) {
      await recordLoginAttempt({ ipAddress, email, context: "system", success: false });
      await sleep(400);
      throw Unauthorized("Credenciales inválidas.");
    }

    const tenant = await Tenant.findById(user.tenantId);
    if (!tenant || !tenant.active) {
      throw Unauthorized("El local está deshabilitado. Contactá al soporte.");
    }

    const sessionToken = generateSessionToken();
    user.currentSessionToken = sessionToken;
    user.lastLoginAt = new Date();
    await user.save();

    const token = signSystemToken({
      uid: user._id.toString(),
      tenantId: user.tenantId.toString(),
      role: user.role,
      sid: sessionToken,
    });

    const refreshToken = signRefreshToken({
      uid: user._id.toString(),
      tenantId: user.tenantId.toString(),
      sid: sessionToken,
    });

    setSystemCookies(token, refreshToken);
    await recordLoginAttempt({ ipAddress, email, context: "system", success: true });

    return ok({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId.toString(),
      },
      tenant: {
        id: tenant._id.toString(),
        name: tenant.name,
        slug: tenant.slug,
        primaryColor: tenant.config.primaryColor,
        currency: tenant.config.currency,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
