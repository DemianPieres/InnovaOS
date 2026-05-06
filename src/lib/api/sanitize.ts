/**
 * Limpia un string removiendo caracteres de control y limitando longitud.
 */
export function sanitizeString(input: unknown, maxLength = 500): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

/**
 * Limpia un email: lowercase, trim, valida formato básico.
 */
export function sanitizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const cleaned = input.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return null;
  return cleaned.slice(0, 200);
}

/**
 * Convierte input a número finito o null si no es válido.
 */
export function toFiniteNumber(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string" && input.trim() !== "") {
    const parsed = Number(input);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/**
 * Limita el tamaño de un payload JSON entrante para evitar abuso.
 */
export function assertPayloadSize(payload: unknown, maxBytes = 256_000): void {
  const size = Buffer.byteLength(JSON.stringify(payload ?? ""));
  if (size > maxBytes) {
    throw new Error("Payload excede el tamaño máximo permitido.");
  }
}
