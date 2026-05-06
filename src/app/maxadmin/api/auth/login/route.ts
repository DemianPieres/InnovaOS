import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { MaxAdmin } from "@/models/MaxAdmin";
import { verifyPassword } from "@/lib/auth/password";
import {
  generateSessionToken,
  signMaxAdminToken,
} from "@/lib/auth/jwt";
import { setMaxAdminCookie } from "@/lib/auth/cookies";
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
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(200),
  password: z.string().min(1).max(200),
});

/**
 * Login del MAXADMIN. Usa secreto JWT separado y NO comparte contexto con sistema.
 */
export async function POST(req: NextRequest) {
  try {
    const { ipAddress } = await enforceLoginRateLimit(req, "maxadmin");
    const body = await req.json().catch(() => ({}));
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    const { email, password } = parsed.data;

    await connectDB();
    const admin = await MaxAdmin.findOne({ email });
    if (!admin || !admin.active) {
      await recordLoginAttempt({ ipAddress, email, context: "maxadmin", success: false });
      await sleep(400);
      throw Unauthorized("Credenciales inválidas.");
    }

    const passwordOk = await verifyPassword(password, admin.passwordHash);
    if (!passwordOk) {
      await recordLoginAttempt({ ipAddress, email, context: "maxadmin", success: false });
      await sleep(400);
      throw Unauthorized("Credenciales inválidas.");
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    const sessionToken = generateSessionToken();
    const token = signMaxAdminToken({
      uid: admin._id.toString(),
      email: admin.email,
      sid: sessionToken,
    });

    setMaxAdminCookie(token);
    await recordLoginAttempt({ ipAddress, email, context: "maxadmin", success: true });

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
