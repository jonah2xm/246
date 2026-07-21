const mongoose = require("mongoose");

const printJobSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["receipt"], default: "receipt" },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    payload: { type: Buffer, required: true }, // raw ESC/POS bytes, generated server-side
    status: { type: String, enum: ["queued", "printed", "failed"], default: "queued" },
    printedAt: { type: Date, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PrintJob", printJobSchema);
