import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { connectDB } from "@/lib/mongodb";
import { requireSystemAuth } from "@/lib/auth/guard";
import {
  errorResponse,
  Forbidden,
  NotFound,
  ok,
  ValidationError,
} from "@/lib/api/errors";

export const runtime = "nodejs";

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(250).optional(),
  order: z.number().int().min(0).max(999).optional(),
  station: z.enum(["kitchen", "bar", "none"]).optional(),
  active: z.boolean().optional(),
});

interface Params {
  params: { id: string };
}

/**
 * Actualiza una categoría asegurando que pertenezca al tenant del usuario.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { tenantId } = await requireSystemAuth(req, {
      roles: ["admin", "manager"],
    });
    if (!Types.ObjectId.isValid(params.id)) throw NotFound();
    const body = await req.json().catch(() => ({}));
    const parsed = UpdateCategorySchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    await connectDB();
    const category = await Category.findById(params.id);
    if (!category) throw NotFound();
    if (category.tenantId.toString() !== tenantId.toString()) {
      throw Forbidden("La categoría no pertenece a tu tenant.");
    }
    Object.assign(category, parsed.data);
    await category.save();
    return ok({ category });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Elimina una categoría sin productos. Si tiene productos asociados, falla.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { tenantId } = await requireSystemAuth(req, {
      roles: ["admin", "manager"],
    });
    if (!Types.ObjectId.isValid(params.id)) throw NotFound();
    await connectDB();
    const category = await Category.findById(params.id);
    if (!category) throw NotFound();
    if (category.tenantId.toString() !== tenantId.toString()) {
      throw Forbidden("La categoría no pertenece a tu tenant.");
    }
    const productsCount = await Product.countDocuments({
      tenantId,
      categoryId: category._id,
    });
    if (productsCount > 0) {
      throw ValidationError(
        "La categoría tiene productos. Movelos o eliminalos primero."
      );
    }
    await category.deleteOne();
    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
