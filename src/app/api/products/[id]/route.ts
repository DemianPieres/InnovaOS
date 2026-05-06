import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
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

const UpdateProductSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(400).optional(),
  price: z.number().min(0).max(10_000_000).optional(),
  cost: z.number().min(0).max(10_000_000).optional(),
  categoryId: z.string().min(1).optional(),
  available: z.boolean().optional(),
  imageUrl: z.string().url().max(500).optional(),
  order: z.number().int().min(0).max(999).optional(),
  station: z.enum(["kitchen", "bar", "none"]).optional(),
  preparationTime: z.number().int().min(0).max(120).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
});

interface Params {
  params: { id: string };
}

/**
 * Actualiza un producto. Si cambia la categoría, verifica que pertenezca al tenant.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { tenantId } = await requireSystemAuth(req, {
      roles: ["admin", "manager"],
    });
    if (!Types.ObjectId.isValid(params.id)) throw NotFound();
    const body = await req.json().catch(() => ({}));
    const parsed = UpdateProductSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    await connectDB();
    const product = await Product.findById(params.id);
    if (!product) throw NotFound();
    if (product.tenantId.toString() !== tenantId.toString()) {
      throw Forbidden("Producto fuera de tu tenant.");
    }
    if (parsed.data.categoryId) {
      if (!Types.ObjectId.isValid(parsed.data.categoryId)) {
        throw ValidationError("categoryId inválido.");
      }
      const category = await Category.findById(parsed.data.categoryId);
      if (!category) throw NotFound("Categoría no encontrada.");
      if (category.tenantId.toString() !== tenantId.toString()) {
        throw Forbidden("Categoría fuera de tu tenant.");
      }
    }
    Object.assign(product, parsed.data);
    await product.save();
    return ok({ product });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Borra un producto del tenant.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { tenantId } = await requireSystemAuth(req, {
      roles: ["admin", "manager"],
    });
    if (!Types.ObjectId.isValid(params.id)) throw NotFound();
    await connectDB();
    const product = await Product.findById(params.id);
    if (!product) throw NotFound();
    if (product.tenantId.toString() !== tenantId.toString()) {
      throw Forbidden("Producto fuera de tu tenant.");
    }
    await product.deleteOne();
    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
