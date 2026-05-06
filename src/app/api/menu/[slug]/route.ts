import { NextRequest } from "next/server";
import { Tenant } from "@/models/Tenant";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { Table } from "@/models/Table";
import { connectDB } from "@/lib/mongodb";
import { errorResponse, NotFound, ok } from "@/lib/api/errors";

export const runtime = "nodejs";

interface Params {
  params: { slug: string };
}

/**
 * Endpoint público de lectura de la carta.
 * Solo expone productos disponibles y categorías activas.
 * Si se pasa ?table=N&t=qrToken, valida la mesa contra el tenant.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const slug = (params.slug || "").toLowerCase();
    if (!/^[a-z0-9-]+$/.test(slug)) throw NotFound();

    await connectDB();
    const tenant = await Tenant.findOne({ slug, active: true }).lean();
    if (!tenant) throw NotFound("Local no encontrado o inactivo.");

    const tableNumber = req.nextUrl.searchParams.get("table");
    const qrToken = req.nextUrl.searchParams.get("t");

    let table = null;
    if (tableNumber && qrToken) {
      const t = await Table.findOne({
        tenantId: tenant._id,
        number: Number(tableNumber),
        qrToken,
        active: true,
      }).lean();
      if (t) {
        table = {
          id: t._id.toString(),
          number: t.number,
          label: t.label,
        };
      }
    }

    const [categories, products] = await Promise.all([
      Category.find({ tenantId: tenant._id, active: true })
        .sort({ order: 1, name: 1 })
        .lean(),
      Product.find({ tenantId: tenant._id, available: true })
        .sort({ order: 1, name: 1 })
        .lean(),
    ]);

    return ok({
      tenant: {
        id: tenant._id.toString(),
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.config.primaryColor,
        currency: tenant.config.currency,
        loyaltyEnabled: tenant.config.loyaltyEnabled,
      },
      table,
      categories: categories.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        description: c.description,
        order: c.order,
      })),
      products: products.map((p) => ({
        id: p._id.toString(),
        categoryId: p.categoryId.toString(),
        name: p.name,
        description: p.description,
        price: p.price,
        order: p.order,
        tags: p.tags,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
