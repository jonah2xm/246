const Order = require("../models/Order");
const PrintJob = require("../models/PrintJob");
const { buildReceiptBuffer } = require("../utils/escpos");

// Staff (cashier/manager) enqueues a receipt print — the counter-PC bridge
// picks it up over its own polling endpoint below.
async function createPrintJob(req, res, next) {
  try {
    const order = await Order.findById(req.body.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const payload = buildReceiptBuffer(order);
    const job = await PrintJob.create({ type: "receipt", orderId: order._id, payload });

    res.status(201).json({ id: job._id, status: job.status });
  } catch (err) {
    next(err);
  }
}

// Bridge polling endpoint — no staff session, authenticated via shared key.
async function listQueued(req, res, next) {
  try {
    const jobs = await PrintJob.find({ status: "queued" }).sort({ createdAt: 1 }).limit(20);
    res.json(
      jobs.map((j) => ({
        id: j._id,
        orderId: j.orderId,
        payloadBase64: j.payload.toString("base64"),
        createdAt: j.createdAt,
      }))
    );
  } catch (err) {
    next(err);
  }
}

async function markPrinted(req, res, next) {
  try {
    const { status, error } = req.body;
    if (!["printed", "failed"].includes(status)) {
      return res.status(400).json({ error: "status must be printed or failed" });
    }
    const job = await PrintJob.findByIdAndUpdate(
      req.params.id,
      { status, printedAt: status === "printed" ? new Date() : null, error: error || null },
      { new: true }
    );
    if (!job) return res.status(404).json({ error: "Print job not found" });
    res.json({ id: job._id, status: job.status });
  } catch (err) {
    next(err);
  }
}

module.exports = { createPrintJob, listQueued, markPrinted };
