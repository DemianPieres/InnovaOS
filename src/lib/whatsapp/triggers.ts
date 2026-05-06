import type { ICustomer } from "@/models/Customer";
import type { IOrder } from "@/models/Order";
import type { ITenant } from "@/models/Tenant";

export type WhatsappTrigger =
  | "welcome"
  | "order:confirmed"
  | "order:ready"
  | "loyalty:level-up"
  | "winback:inactive"
  | "birthday";

export interface WhatsappPayload {
  trigger: WhatsappTrigger;
  to: string;
  message: string;
  tenantId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Construye el mensaje correspondiente a un trigger automático de WhatsApp.
 * NO envía el mensaje, solo arma el payload — el envío real se delega al
 * proveedor configurado (WhatsApp Business API o Twilio) cuando esté disponible.
 */
export function buildWhatsappPayload(params: {
  trigger: WhatsappTrigger;
  customer: ICustomer;
  tenant: ITenant;
  order?: IOrder;
}): WhatsappPayload | null {
  const { trigger, customer, tenant, order } = params;
  if (!customer.phone || !customer.consents?.whatsapp) return null;
  const name = customer.name.split(" ")[0];

  switch (trigger) {
    case "welcome":
      return {
        trigger,
        to: customer.phone,
        tenantId: tenant._id.toString(),
        message: `Hola ${name}, ¡bienvenido a ${tenant.name}! Te sumamos al programa de fidelidad. Cada compra acumula puntos automáticamente.`,
      };
    case "order:confirmed":
      return {
        trigger,
        to: customer.phone,
        tenantId: tenant._id.toString(),
        message: `Hola ${name}, recibimos tu pedido en ${tenant.name}. Total: ${order?.total ?? 0}. ¡En breve te lo llevamos!`,
        metadata: { orderId: order?._id.toString() },
      };
    case "order:ready":
      return {
        trigger,
        to: customer.phone,
        tenantId: tenant._id.toString(),
        message: `${name}, tu pedido en ${tenant.name} ya está listo. ¡Que lo disfrutes!`,
        metadata: { orderId: order?._id.toString() },
      };
    case "loyalty:level-up":
      return {
        trigger,
        to: customer.phone,
        tenantId: tenant._id.toString(),
        message: `¡Felicitaciones ${name}! Subiste de nivel en ${tenant.name}. Ahora sos ${customer.level.toUpperCase()}.`,
      };
    case "winback:inactive":
      return {
        trigger,
        to: customer.phone,
        tenantId: tenant._id.toString(),
        message: `Hola ${name}, te extrañamos en ${tenant.name}. Tenés ${customer.points} puntos esperándote.`,
      };
    case "birthday":
      return {
        trigger,
        to: customer.phone,
        tenantId: tenant._id.toString(),
        message: `¡Feliz cumpleaños ${name}! Pasá por ${tenant.name} y disfrutá una sorpresa de regalo.`,
      };
    default:
      return null;
  }
}

/**
 * Stub de envío real. Cuando WHATSAPP_API_TOKEN o TWILIO esté configurado,
 * este es el punto único donde se enviarán los mensajes.
 */
export async function sendWhatsapp(payload: WhatsappPayload): Promise<void> {
  const provider = process.env.WHATSAPP_API_TOKEN
    ? "meta"
    : process.env.TWILIO_ACCOUNT_SID
      ? "twilio"
      : null;
  if (!provider) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[WhatsApp:NOOP]", payload.trigger, "→", payload.to);
    }
    return;
  }
  // Implementación de envío diferida hasta tener credenciales reales.
}
