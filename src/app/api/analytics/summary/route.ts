import { NextRequest } from "next/server";
import { startOfDay, endOfDay } from "date-fns";
import { Order } from "@/models/Order";
import { Table } from "@/models/Table";
import { Product } from "@/models/Product";
import { Customer } from "@/models/Customer";
import { connectDB } from "@/lib/mongodb";
import { requireSystemAuth } from "@/lib/auth/guard";
import { errorResponse, ok } from "@/lib/api/errors";

export const runtime = "nodejs";

/**
 * Devuelve métricas resumidas para el dashboard del admin.
 */
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireSystemAuth(req);
    await connectDB();

    const start = startOfDay(new Date());
    const end = endOfDay(new Date());

    const [
      ordersToday,
      pendingOrders,
      totalTables,
      occupiedTables,
      totalProducts,
      totalCustomers,
    ] = await Promise.all([
      Order.find({
        tenantId,
        createdAt: { $gte: start, $lte: end },
        status: { $in: ["paid", "served"] },
      }).select("total"),
      Order.countDocuments({
        tenantId,
        status: { $in: ["pending", "confirmed", "preparing", "ready"] },
      }),
      Table.countDocuments({ tenantId, active: true }),
      Table.countDocuments({
        tenantId,
        status: { $in: ["occupied", "billing"] },
      }),
      Product.countDocuments({ tenantId }),
      Customer.countDocuments({ tenantId, active: true }),
    ]);

    const totalToday = ordersToday.reduce((acc, o) => acc + (o.total || 0), 0);

    return ok({
      stats: {
        totalToday,
        ordersToday: ordersToday.length,
        pendingOrders,
        totalTables,
        occupiedTables,
        totalProducts,
        totalCustomers,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
