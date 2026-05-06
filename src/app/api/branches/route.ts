import { NextRequest } from "next/server";
import { z } from "zod";
import { Branch } from "@/models/Branch";
import { connectDB } from "@/lib/mongodb";
import { requireSystemAuth } from "@/lib/auth/guard";
import {
  errorResponse,
  ok,
  ValidationError,
} from "@/lib/api/errors";

export const runtime = "nodejs";

const CreateBranchSchema = z.object({
  name: z.string().min(1).max(120),
  address: z.string().max(250).optional(),
  phone: z.string().max(50).optional(),
});

/**
 * Lista las sucursales del tenant.
 */
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireSystemAuth(req);
    await connectDB();
    const branches = await Branch.find({ tenantId }).sort({ isMain: -1, name: 1 }).lean();
    return ok({ branches });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Crea una nueva sucursal del tenant.
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await requireSystemAuth(req, { roles: ["admin"] });
    const body = await req.json().catch(() => ({}));
    const parsed = CreateBranchSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    await connectDB();
    const branch = await Branch.create({
      tenantId,
      ...parsed.data,
      isMain: false,
      active: true,
    });
    return ok({ branch }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
