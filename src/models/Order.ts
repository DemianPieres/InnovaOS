import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "served"
  | "paid"
  | "cancelled";

export type OrderItemStatus = "pending" | "preparing" | "ready" | "served" | "cancelled";

export interface IOrderItem {
  _id?: Types.ObjectId;
  productId: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  station: "kitchen" | "bar" | "none";
  status: OrderItemStatus;
}

/**
 * Pedido realizado desde la carta del cliente o cargado por un mozo.
 */
export interface IOrder extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  branchId?: Types.ObjectId;
  tableId?: Types.ObjectId;
  tableNumber?: number;
  customerId?: Types.ObjectId;
  customerName?: string;
  items: IOrderItem[];
  subtotal: number;
  discount: number;
  tip: number;
  total: number;
  status: OrderStatus;
  source: "customer-qr" | "waiter" | "counter";
  notes?: string;
  paidAt?: Date;
  paymentId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    notes: { type: String, trim: true, maxlength: 250 },
    station: {
      type: String,
      enum: ["kitchen", "bar", "none"],
      default: "none",
    },
    status: {
      type: String,
      enum: ["pending", "preparing", "ready", "served", "cancelled"],
      default: "pending",
    },
  },
  { _id: true }
);

const OrderSchema = new Schema<IOrder>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
    tableId: { type: Schema.Types.ObjectId, ref: "Table", index: true },
    tableNumber: { type: Number },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", index: true },
    customerName: { type: String, trim: true },
    items: { type: [OrderItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0, default: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tip: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0, default: 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "ready", "served", "paid", "cancelled"],
      default: "pending",
      index: true,
    },
    source: {
      type: String,
      enum: ["customer-qr", "waiter", "counter"],
      default: "customer-qr",
    },
    notes: { type: String, trim: true, maxlength: 500 },
    paidAt: { type: Date },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
  },
  { timestamps: true }
);

OrderSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ tenantId: 1, tableId: 1, status: 1 });
OrderSchema.index({ tenantId: 1, createdAt: -1 });

export const Order: Model<IOrder> =
  (mongoose.models.Order as Model<IOrder>) ||
  mongoose.model<IOrder>("Order", OrderSchema);
