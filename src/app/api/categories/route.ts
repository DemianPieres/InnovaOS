import { NextRequest } from "next/server";
import { z } from "zod";
import { Category } from "@/models/Category";
import { connectDB } from "@/lib/mongodb";
import { requireSystemAuth } from "@/lib/auth/guard";
import {
  Conflict,
  errorResponse,
  ok,
  ValidationError,
} from "@/lib/api/errors";

export const runtime = "nodejs";

const CreateCategorySchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(250).optional(),
  order: z.number().int().min(0).max(999).optional(),
  station: z.enum(["kitchen", "bar", "none"]).optional(),
});

/**
 * Lista todas las categorías del tenant autenticado.
 */
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireSystemAuth(req);
    await connectDB();
    const categories = await Category.find({ tenantId })
      .sort({ order: 1, name: 1 })
      .lean();
    return ok({ categories });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Crea una nueva categoría dentro del tenant del usuario autenticado.
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await requireSystemAuth(req, {
      roles: ["admin", "manager"],
    });
    const body = await req.json().catch(() => ({}));
    const parsed = CreateCategorySchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    await connectDB();
    const exists = await Category.findOne({ tenantId, name: parsed.data.name });
    if (exists) throw Conflict("Ya existe una categoría con ese nombre.");
    const category = await Category.create({
      tenantId,
      name: parsed.data.name,
      description: parsed.data.description,
      order: parsed.data.order ?? 0,
      station: parsed.data.station ?? "none",
    });
    return ok({ category }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
