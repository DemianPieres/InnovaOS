import { NextRequest } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { Table } from "@/models/Table";
import { connectDB } from "@/lib/mongodb";
import { requireSystemAuth } from "@/lib/auth/guard";
import {
  Conflict,
  errorResponse,
  ok,
  ValidationError,
} from "@/lib/api/errors";

export const runtime = "nodejs";

const CreateTableSchema = z.object({
  number: z.number().int().min(1).max(9999),
  label: z.string().max(40).optional(),
  capacity: z.number().int().min(1).max(50).optional(),
  zone: z.string().max(40).optional(),
});

/**
 * Lista todas las mesas del tenant autenticado.
 */
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireSystemAuth(req);
    await connectDB();
    const tables = await Table.find({ tenantId }).sort({ number: 1 }).lean();
    return ok({ tables });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Crea una nueva mesa generando un qrToken aleatorio único.
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await requireSystemAuth(req, {
      roles: ["admin", "manager"],
    });
    const body = await req.json().catch(() => ({}));
    const parsed = CreateTableSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    await connectDB();
    const exists = await Table.findOne({
      tenantId,
      number: parsed.data.number,
    });
    if (exists) throw Conflict("Ya existe una mesa con ese número.");

    const qrToken = randomBytes(20).toString("hex");
    const table = await Table.create({
      tenantId,
      number: parsed.data.number,
      label: parsed.data.label,
      capacity: parsed.data.capacity ?? 4,
      zone: parsed.data.zone,
      qrToken,
      status: "free",
      active: true,
    });
    return ok({ table }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
