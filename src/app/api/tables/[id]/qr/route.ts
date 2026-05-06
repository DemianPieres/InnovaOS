import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import QRCode from "qrcode";
import { Table } from "@/models/Table";
import { Tenant } from "@/models/Tenant";
import { connectDB } from "@/lib/mongodb";
import { requireSystemAuth } from "@/lib/auth/guard";
import { errorResponse, Forbidden, NotFound } from "@/lib/api/errors";

export const runtime = "nodejs";

interface Params {
  params: { id: string };
}

/**
 * Genera un PNG con el QR de la mesa apuntando a /menu/[slug]?table=N&t=token.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { tenantId } = await requireSystemAuth(req);
    if (!Types.ObjectId.isValid(params.id)) throw NotFound();
    await connectDB();
    const table = await Table.findById(params.id);
    if (!table) throw NotFound();
    if (table.tenantId.toString() !== tenantId.toString()) {
      throw Forbidden("Mesa fuera de tu tenant.");
    }
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw NotFound("Tenant no encontrado.");

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const url = `${baseUrl}/menu/${tenant.slug}?table=${table.number}&t=${table.qrToken}`;

    const png = await QRCode.toBuffer(url, {
      errorCorrectionLevel: "M",
      type: "png",
      margin: 1,
      width: 512,
      color: {
        dark: "#111111",
        light: "#FFFFFF",
      },
    });

    const body = new Uint8Array(png);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="mesa-${table.number}.png"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
