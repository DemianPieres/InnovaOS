import { NextResponse } from "next/server";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status = 400, code = "BAD_REQUEST", details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Convierte un error en una respuesta JSON estándar para la API.
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: error.status }
    );
  }
  if (error instanceof Error) {
    const message = error.message || "Error interno del servidor";
    if (process.env.NODE_ENV !== "production") {
      console.error("[API ERROR]", message, error.stack);
    }
    return NextResponse.json(
      { error: "Error interno del servidor", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
  return NextResponse.json(
    { error: "Error desconocido", code: "UNKNOWN_ERROR" },
    { status: 500 }
  );
}

/**
 * Helper para responder con éxito en formato consistente.
 */
export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Helpers para errores comunes.
 */
export const Unauthorized = (message = "No autorizado") =>
  new ApiError(message, 401, "UNAUTHORIZED");
export const Forbidden = (message = "Acceso denegado") =>
  new ApiError(message, 403, "FORBIDDEN");
export const NotFound = (message = "Recurso no encontrado") =>
  new ApiError(message, 404, "NOT_FOUND");
export const Conflict = (message: string) =>
  new ApiError(message, 409, "CONFLICT");
export const ValidationError = (message: string, details?: unknown) =>
  new ApiError(message, 422, "VALIDATION_ERROR", details);
export const RateLimitError = (message = "Demasiados intentos, esperá un momento.") =>
  new ApiError(message, 429, "RATE_LIMITED");
