import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { Table } from "@/models/Table";
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

const UpdateTableSchema = z.object({
  number: z.number().int().min(1).max(9999).optional(),
  label: z.string().max(40).optional(),
  capacity: z.number().int().min(1).max(50).optional(),
  zone: z.string().max(40).optional(),
  status: z
    .enum(["free", "occupied", "billing", "reserved", "disabled"])
    .optional(),
  active: z.boolean().optional(),
});

interface Params {
  params: { id: string };
}

/**
 * Actualiza una mesa, validando pertenencia al tenant.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { tenantId } = await requireSystemAuth(req, {
      roles: ["admin", "manager", "waiter"],
    });
    if (!Types.ObjectId.isValid(params.id)) throw NotFound();
    const body = await req.json().catch(() => ({}));
    const parsed = UpdateTableSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError("Datos inválidos.", parsed.error.flatten());
    }
    await connectDB();
    const table = await Table.findById(params.id);
    if (!table) throw NotFound();
    if (table.tenantId.toString() !== tenantId.toString()) {
      throw Forbidden("Mesa fuera de tu tenant.");
    }
    Object.assign(table, parsed.data);
    await table.save();
    return ok({ table });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Elimina una mesa del tenant.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { tenantId } = await requireSystemAuth(req, {
      roles: ["admin", "manager"],
    });
    if (!Types.ObjectId.isValid(params.id)) throw NotFound();
    await connectDB();
    const table = await Table.findById(params.id);
    if (!table) throw NotFound();
    if (table.tenantId.toString() !== tenantId.toString()) {
      throw Forbidden("Mesa fuera de tu tenant.");
    }
    await table.deleteOne();
    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
