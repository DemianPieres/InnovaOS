import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hashea un password usando bcrypt con cost factor seguro.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compara un password en plano contra un hash bcrypt almacenado.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false;
  return bcrypt.compare(plain, hash);
}

/**
 * Valida la fortaleza mínima de un password (≥8 chars, mayús/minús/dígito).
 */
export function isStrongPassword(plain: string): boolean {
  return (
    plain.length >= 8 &&
    /[a-z]/.test(plain) &&
    /[A-Z]/.test(plain) &&
    /[0-9]/.test(plain)
  );
}
