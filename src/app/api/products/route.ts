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

const CreateProductSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(400).optional(),
  price: z.number().min(0).max(10_000_000),
  cost: z.number().min(0).max(10_000_000).optional(),
  categoryId: z.string().min(1),
  available: z.boolean().optional(),
  imageUrl: z.string().url().max(500).optional(),
  order: z.number().int().min(0).max(999).optional(),
  station: z.enum(["kitchen", "bar", "none"]).optional(),
  preparationTime: z.number().int().min(0).max(120).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
});

/**
 * Lista productos del tenant. Acepta filtros por categoría y disponibilidad.
 */
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireSystemAuth(req);
    const url = req.nextUrl;
    const categoryId = url.searchParams.get("categoryId");
    const onlyAvailable = url.searchParams.get("available");

    const filter: Record<string, unknown> = { tenantId };
    if (categoryId && Types.ObjectId.isValid(categoryId)) {
      filter.categoryId = categoryId;
    }
    if (onlyAvailable === "true") filter.available = true;

    await connectDB();
    const products = await Product.find(filter)
      .sort({ order: 1, name: 1 })
      .lean();
    return ok({ products });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Crea un nuevo producto. Verifica que la categoría pertenezca al tenant.
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await requireSystemAuth(req, {
      roles: ["admin", "manager"],
    });
    const body = await req.json().catch(() => ({}));
    const parsed = CreateProductSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    if (!Types.ObjectId.isValid(parsed.data.categoryId)) {
      throw ValidationError("categoryId inválido.");
    }
    await connectDB();
    const category = await Category.findById(parsed.data.categoryId);
    if (!category) throw NotFound("Categoría no encontrada.");
    if (category.tenantId.toString() !== tenantId.toString()) {
      throw Forbidden("La categoría no pertenece a tu tenant.");
    }

    const product = await Product.create({
      ...parsed.data,
      tenantId,
      station: parsed.data.station ?? category.station,
    });
    return ok({ product }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
