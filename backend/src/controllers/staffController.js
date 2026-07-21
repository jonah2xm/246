const Staff = require("../models/Staff");
const Shift = require("../models/Shift");

// For assignment dropdowns (table assignment, etc).
async function listStaff(req, res, next) {
  try {
    const staff = await Staff.find({ active: true }).select("name role").sort({ name: 1 });
    res.json(staff);
  } catch (err) {
    next(err);
  }
}

async function clockIn(req, res, next) {
  try {
    const open = await Shift.findOne({ staffId: req.staff.id, clockOut: null });
    if (open) return res.status(409).json({ error: "Shift déjà en cours" });

    const shift = await Shift.create({ staffId: req.staff.id, clockIn: new Date() });
    res.status(201).json(shift);
  } catch (err) {
    next(err);
  }
}

async function clockOut(req, res, next) {
  try {
    const shift = await Shift.findOneAndUpdate(
      { staffId: req.staff.id, clockOut: null },
      { clockOut: new Date() },
      { new: true }
    );
    if (!shift) return res.status(404).json({ error: "Aucun shift en cours" });
    res.json(shift);
  } catch (err) {
    next(err);
  }
}

async function myShift(req, res, next) {
  try {
    const shift = await Shift.findOne({ staffId: req.staff.id, clockOut: null });
    res.json(shift);
  } catch (err) {
    next(err);
  }
}

// Manager view: per-staff order counts today (a light stand-in for full performance tracking).
async function performanceToday(req, res, next) {
  try {
    const Order = require("../models/Order");
    const { todayKey } = require("../utils/queueNumber");

    const orders = await Order.find({ businessDate: todayKey() });
    const tally = new Map();

    for (const o of orders) {
      for (const ev of o.statusHistory) {
        if (ev.status === "completed" && ev.byStaffId) {
          const key = String(ev.byStaffId);
          tally.set(key, (tally.get(key) || 0) + 1);
        }
      }
      if (o.payment.status === "paid" && o.payment.byStaffId) {
        const key = `pay:${o.payment.byStaffId}`;
        tally.set(key, (tally.get(key) || 0) + 1);
      }
    }

    const staffIds = [...new Set([...tally.keys()].map((k) => k.replace("pay:", "")))];
    const staff = await Staff.find({ _id: { $in: staffIds } }).select("name role");
    const staffById = new Map(staff.map((s) => [String(s._id), s]));

    const result = staffIds.map((id) => ({
      staffId: id,
      name: staffById.get(id)?.name || "?",
      role: staffById.get(id)?.role || "?",
      ordersCompleted: tally.get(id) || 0,
      paymentsHandled: tally.get(`pay:${id}`) || 0,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listStaff, clockIn, clockOut, myShift, performanceToday };
