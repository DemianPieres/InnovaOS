import { NextRequest } from "next/server";
import { Types } from "mongoose";
import {
  MAXADMIN_TOKEN_COOKIE,
  SYSTEM_TOKEN_COOKIE,
} from "@/lib/auth/cookies";
import {
  verifyMaxAdminToken,
  verifySystemToken,
  type SystemTokenPayload,
  type MaxAdminTokenPayload,
} from "@/lib/auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { User, type IUser, type UserRole } from "@/models/User";
import { MaxAdmin, type IMaxAdmin } from "@/models/MaxAdmin";
import { Forbidden, Unauthorized } from "@/lib/api/errors";

export interface AuthContext {
  user: IUser;
  payload: SystemTokenPayload;
  tenantId: Types.ObjectId;
}

export interface MaxAdminContext {
  admin: IMaxAdmin;
  payload: MaxAdminTokenPayload;
}

/**
 * Extrae el token del sistema desde cookie o Authorization header.
 */
function extractSystemToken(req: NextRequest): string | null {
  const cookie = req.cookies.get(SYSTEM_TOKEN_COOKIE)?.value;
  if (cookie) return cookie;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

/**
 * Extrae el token de MAXADMIN desde cookie o Authorization header.
 */
function extractMaxAdminToken(req: NextRequest): string | null {
  const cookie = req.cookies.get(MAXADMIN_TOKEN_COOKIE)?.value;
  if (cookie) return cookie;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

/**
 * Garantiza que la request viene de un usuario del sistema autenticado y con sesión válida.
 * RECHAZA cualquier token con contexto MAXADMIN para asegurar separación total de contextos.
 */
export async function requireSystemAuth(
  req: NextRequest,
  options?: { roles?: UserRole[] }
): Promise<AuthContext> {
  const token = extractSystemToken(req);
  if (!token) throw Unauthorized("Token ausente.");

  const payload = verifySystemToken(token);
  if (!payload) throw Unauthorized("Token inválido o expirado.");

  await connectDB();
  const user = await User.findById(payload.uid);
  if (!user) throw Unauthorized("Usuario no encontrado.");
  if (!user.active) throw Forbidden("Usuario inactivo.");

  if (user.tenantId.toString() !== payload.tenantId) {
    throw Forbidden("Tenant del token no coincide con el usuario.");
  }
  if (user.currentSessionToken !== payload.sid) {
    throw Unauthorized("Sesión inválida (otra sesión está activa).");
  }
  if (options?.roles && !options.roles.includes(user.role)) {
    throw Forbidden("Tu rol no tiene permiso para esta acción.");
  }

  return { user, payload, tenantId: user.tenantId };
}

/**
 * Garantiza que la request viene de un MAXADMIN autenticado.
 * RECHAZA tokens de contexto sistema.
 */
export async function requireMaxAdminAuth(
  req: NextRequest
): Promise<MaxAdminContext> {
  const token = extractMaxAdminToken(req);
  if (!token) throw Unauthorized("Token MAXADMIN ausente.");

  const payload = verifyMaxAdminToken(token);
  if (!payload) throw Unauthorized("Token MAXADMIN inválido o expirado.");

  await connectDB();
  const admin = await MaxAdmin.findById(payload.uid);
  if (!admin) throw Unauthorized("MAXADMIN no encontrado.");
  if (!admin.active) throw Forbidden("MAXADMIN inactivo.");

  return { admin, payload };
}
