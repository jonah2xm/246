const mongoose = require("mongoose");

const ORDER_STATUSES = ["new", "in_progress", "ready", "completed", "cancelled"];
const PAYMENT_METHODS = ["cash", "tpe"];
const PAYMENT_STATUSES = ["pending", "paid"];

const comboSelectionSchema = new mongoose.Schema(
  { name: { type: String, required: true }, sizeLabel: { type: String, required: true } },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", default: null },
    name: { type: String, required: true },
    sizeLabel: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
    supplements: { type: [String], default: [] },
    station: { type: String, default: "grill" },
    comboSelections: { type: [comboSelectionSchema], default: [] },
  },
  { _id: false }
);

const statusEventSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, required: true },
    byStaffId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", default: null },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: Number, required: true },
    businessDate: { type: String, required: true, index: true }, // "YYYY-MM-DD", queue resets daily
    mode: { type: String, enum: ["table", "delivery"], default: "table" },
    source: { type: String, enum: ["qr", "counter"], default: "qr" }, // QR scan vs. entered at the caisse
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "TableSession", default: null },
    items: { type: [orderItemSchema], required: true },
    total: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: "new", index: true },
    statusHistory: { type: [statusEventSchema], default: [] },
    payment: {
      method: { type: String, enum: PAYMENT_METHODS, default: "cash" },
      status: { type: String, enum: PAYMENT_STATUSES, default: "pending" },
      paidAt: { type: Date, default: null },
      byStaffId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", default: null },
    },
    scheduledFor: { type: Date, default: null },
    customerPhone: { type: String, default: null },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
