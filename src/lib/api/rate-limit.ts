import { NextRequest } from "next/server";
import { LoginAttempt } from "@/models/LoginAttempt";
import { connectDB } from "@/lib/mongodb";
import { RateLimitError } from "@/lib/api/errors";

/**
 * Extrae la IP del request usando los headers más confiables disponibles.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

/**
 * Aplica rate limiting a endpoints de login. Permite máximo 5 intentos fallidos
 * por IP en una ventana de 60 segundos. Lanza RateLimitError si excede.
 */
export async function enforceLoginRateLimit(
  req: NextRequest,
  context: "system" | "maxadmin"
): Promise<{ ipAddress: string }> {
  await connectDB();
  const ipAddress = getClientIp(req);
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

  const recentFailed = await LoginAttempt.countDocuments({
    ipAddress,
    context,
    success: false,
    createdAt: { $gte: oneMinuteAgo },
  });

  if (recentFailed >= 5) {
    throw RateLimitError(
      "Demasiados intentos fallidos. Esperá 1 minuto antes de volver a intentar."
    );
  }
  return { ipAddress };
}

/**
 * Registra un intento de login (éxito o fallo) para tracking.
 */
export async function recordLoginAttempt(params: {
  ipAddress: string;
  email?: string;
  context: "system" | "maxadmin";
  success: boolean;
}): Promise<void> {
  await connectDB();
  await LoginAttempt.create(params);
}
