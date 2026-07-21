const Feedback = require("../models/Feedback");
const Order = require("../models/Order");

// Public — submitted by the customer right after pickup, no auth.
async function submitFeedback(req, res, next) {
  try {
    const { orderId, rating, comment = "" } = req.body;
    if (!orderId || typeof rating !== "number" || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "orderId and a rating (1-5) are required" });
    }
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const feedback = await Feedback.create({ orderId, rating, comment });
    res.status(201).json({ id: feedback._id });
  } catch (err) {
    next(err);
  }
}

async function listFeedback(req, res, next) {
  try {
    const feedback = await Feedback.find().sort({ createdAt: -1 }).populate("orderId", "orderNumber total");
    res.json(feedback);
  } catch (err) {
    next(err);
  }
}

module.exports = { submitFeedback, listFeedback };
