import jwt, { type SignOptions, type JwtPayload } from "jsonwebtoken";
import { randomUUID } from "crypto";

export type AuthContext = "system" | "maxadmin";

export interface SystemTokenPayload extends JwtPayload {
  ctx: "system";
  uid: string;
  tenantId: string;
  role: string;
  sid: string;
}

export interface MaxAdminTokenPayload extends JwtPayload {
  ctx: "maxadmin";
  uid: string;
  email: string;
  sid: string;
}

export type AppTokenPayload = SystemTokenPayload | MaxAdminTokenPayload;

interface SecretsConfig {
  appSecret: string;
  appExpires: string;
  refreshSecret: string;
  refreshExpires: string;
  maxadminSecret: string;
  maxadminExpires: string;
}

/**
 * Lee y valida los secretos JWT desde variables de entorno. Falla rápido
 * si alguna pieza crítica no está definida.
 */
function getSecrets(): SecretsConfig {
  const appSecret = process.env.APP_JWT_SECRET;
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
  const maxadminSecret = process.env.MAXADMIN_JWT_SECRET;

  if (!appSecret || appSecret.length < 24) {
    throw new Error("APP_JWT_SECRET ausente o demasiado corto.");
  }
  if (!refreshSecret || refreshSecret.length < 24) {
    throw new Error("REFRESH_TOKEN_SECRET ausente o demasiado corto.");
  }
  if (!maxadminSecret || maxadminSecret.length < 24) {
    throw new Error("MAXADMIN_JWT_SECRET ausente o demasiado corto.");
  }

  return {
    appSecret,
    appExpires: process.env.APP_JWT_EXPIRES_IN || "8h",
    refreshSecret,
    refreshExpires: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
    maxadminSecret,
    maxadminExpires: process.env.MAXADMIN_JWT_EXPIRES_IN || "8h",
  };
}

/**
 * Genera un sessionToken único usado para invalidar sesiones duplicadas.
 */
export function generateSessionToken(): string {
  return randomUUID();
}

/**
 * Firma un token JWT del sistema (usuarios de tenants).
 */
export function signSystemToken(
  payload: Omit<SystemTokenPayload, "ctx" | "iat" | "exp">
): string {
  const { appSecret, appExpires } = getSecrets();
  const options: SignOptions = { expiresIn: appExpires as SignOptions["expiresIn"] };
  return jwt.sign({ ...payload, ctx: "system" }, appSecret, options);
}

/**
 * Firma un refresh token de larga duración para el sistema.
 */
export function signRefreshToken(
  payload: { uid: string; tenantId: string; sid: string }
): string {
  const { refreshSecret, refreshExpires } = getSecrets();
  const options: SignOptions = { expiresIn: refreshExpires as SignOptions["expiresIn"] };
  return jwt.sign(payload, refreshSecret, options);
}

/**
 * Firma un token JWT exclusivo para MAXADMIN. Usa secret separado.
 */
export function signMaxAdminToken(
  payload: Omit<MaxAdminTokenPayload, "ctx" | "iat" | "exp">
): string {
  const { maxadminSecret, maxadminExpires } = getSecrets();
  const options: SignOptions = { expiresIn: maxadminExpires as SignOptions["expiresIn"] };
  return jwt.sign({ ...payload, ctx: "maxadmin" }, maxadminSecret, options);
}

/**
 * Verifica un token del sistema. Retorna null si es inválido o pertenece a otro contexto.
 */
export function verifySystemToken(token: string): SystemTokenPayload | null {
  try {
    const { appSecret } = getSecrets();
    const decoded = jwt.verify(token, appSecret) as JwtPayload & { ctx?: string };
    if (decoded.ctx !== "system") return null;
    return decoded as SystemTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Verifica un refresh token del sistema.
 */
export function verifyRefreshToken(
  token: string
): { uid: string; tenantId: string; sid: string } | null {
  try {
    const { refreshSecret } = getSecrets();
    const decoded = jwt.verify(token, refreshSecret) as JwtPayload & {
      uid?: string;
      tenantId?: string;
      sid?: string;
    };
    if (!decoded.uid || !decoded.tenantId || !decoded.sid) return null;
    return { uid: decoded.uid, tenantId: decoded.tenantId, sid: decoded.sid };
  } catch {
    return null;
  }
}

/**
 * Verifica un token MAXADMIN. Retorna null si es inválido o pertenece a otro contexto.
 */
export function verifyMaxAdminToken(token: string): MaxAdminTokenPayload | null {
  try {
    const { maxadminSecret } = getSecrets();
    const decoded = jwt.verify(token, maxadminSecret) as JwtPayload & { ctx?: string };
    if (decoded.ctx !== "maxadmin") return null;
    return decoded as MaxAdminTokenPayload;
  } catch {
    return null;
  }
}
