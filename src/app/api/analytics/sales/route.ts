import { NextRequest } from "next/server";
import { startOfDay, subDays } from "date-fns";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { connectDB } from "@/lib/mongodb";
import { requireSystemAuth } from "@/lib/auth/guard";
import { errorResponse, ok } from "@/lib/api/errors";

export const runtime = "nodejs";

/**
 * Devuelve métricas de ventas: ventas por día (últimos 30), top productos y mix de métodos.
 */
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireSystemAuth(req);
    await connectDB();

    const days = Number(req.nextUrl.searchParams.get("days") || 30);
    const since = startOfDay(subDays(new Date(), days));

    const [salesByDay, topProducts, paymentMix] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            tenantId: tenantId,
            status: "paid",
            createdAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            total: { $sum: "$total" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        {
          $match: {
            tenantId: tenantId,
            status: "paid",
            createdAt: { $gte: since },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            name: { $first: "$items.name" },
            quantity: { $sum: "$items.quantity" },
            revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]),
      Payment.aggregate([
        {
          $match: {
            tenantId: tenantId,
            status: "completed",
            createdAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: "$method",
            total: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return ok({ salesByDay, topProducts, paymentMix });
  } catch (error) {
    return errorResponse(error);
  }
}
