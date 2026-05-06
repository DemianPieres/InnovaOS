import { cookies } from "next/headers";

export const SYSTEM_TOKEN_COOKIE = "innovaos_token";
export const SYSTEM_REFRESH_COOKIE = "innovaos_refresh";
export const MAXADMIN_TOKEN_COOKIE = "innovaos_maxadmin_token";

const isProd = process.env.NODE_ENV === "production";

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge?: number;
}

const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  path: "/",
};

/**
 * Guarda las cookies de sesión del sistema (token + refresh token).
 */
export function setSystemCookies(token: string, refreshToken: string): void {
  const store = cookies();
  store.set(SYSTEM_TOKEN_COOKIE, token, {
    ...baseOptions,
    maxAge: 60 * 60 * 8,
  });
  store.set(SYSTEM_REFRESH_COOKIE, refreshToken, {
    ...baseOptions,
    maxAge: 60 * 60 * 24 * 7,
  });
}

/**
 * Guarda la cookie de sesión de MAXADMIN.
 */
export function setMaxAdminCookie(token: string): void {
  const store = cookies();
  store.set(MAXADMIN_TOKEN_COOKIE, token, {
    ...baseOptions,
    maxAge: 60 * 60 * 8,
  });
}

/**
 * Borra todas las cookies de autenticación del sistema.
 */
export function clearSystemCookies(): void {
  const store = cookies();
  store.delete(SYSTEM_TOKEN_COOKIE);
  store.delete(SYSTEM_REFRESH_COOKIE);
}

/**
 * Borra la cookie de MAXADMIN.
 */
export function clearMaxAdminCookie(): void {
  const store = cookies();
  store.delete(MAXADMIN_TOKEN_COOKIE);
}
