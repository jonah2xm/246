const Order = require("../models/Order");
const Staff = require("../models/Staff");
const { todayKey } = require("../utils/queueNumber");

// Single-location, single-day order volumes are small enough to aggregate
// in JS rather than a Mongo pipeline — simpler to read and adjust.
async function summary(req, res, next) {
  try {
    const businessDate = req.query.date || todayKey();
    const orders = await Order.find({ businessDate, status: { $ne: "cancelled" } });

    let revenue = 0;
    const byItem = new Map();
    const byHour = new Map();
    const byStaffCompleted = new Map();
    const byStaffPayments = new Map();
    const comboCounts = new Map();

    for (const o of orders) {
      revenue += o.total;

      const hour = new Date(o.createdAt).getHours();
      const h = byHour.get(hour) || { orders: 0, revenue: 0 };
      h.orders += 1;
      h.revenue += o.total;
      byHour.set(hour, h);

      for (const it of o.items) {
        const cur = byItem.get(it.name) || { qty: 0, revenue: 0 };
        cur.qty += it.qty;
        cur.revenue += it.qty * it.unitPrice;
        byItem.set(it.name, cur);

        if (it.comboSelections && it.comboSelections.length) {
          comboCounts.set(it.name, (comboCounts.get(it.name) || 0) + it.qty);
        }
      }

      for (const ev of o.statusHistory) {
        if (ev.status === "completed" && ev.byStaffId) {
          const k = String(ev.byStaffId);
          byStaffCompleted.set(k, (byStaffCompleted.get(k) || 0) + 1);
        }
      }
      if (o.payment.status === "paid" && o.payment.byStaffId) {
        const k = String(o.payment.byStaffId);
        const cur = byStaffPayments.get(k) || { count: 0, revenue: 0 };
        cur.count += 1;
        cur.revenue += o.total;
        byStaffPayments.set(k, cur);
      }
    }

    const staffIds = [...new Set([...byStaffCompleted.keys(), ...byStaffPayments.keys()])];
    const staffDocs = await Staff.find({ _id: { $in: staffIds } }).select("name role");
    const staffById = new Map(staffDocs.map((s) => [String(s._id), s]));

    const hourEntries = [...byHour.entries()].map(([hour, v]) => ({ hour, ...v }));
    const peakHour = [...hourEntries].sort((a, b) => b.revenue - a.revenue)[0] || null;

    res.json({
      businessDate,
      orderCount: orders.length,
      revenue,
      averageOrderValue: orders.length ? Math.round(revenue / orders.length) : 0,
      salesByItem: [...byItem.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue),
      salesByHour: hourEntries.sort((a, b) => a.hour - b.hour),
      peakHour,
      popularCombos: [...comboCounts.entries()]
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty),
      staffPerformance: staffIds.map((id) => ({
        staffId: id,
        name: staffById.get(id)?.name || "?",
        role: staffById.get(id)?.role || "?",
        ordersCompleted: byStaffCompleted.get(id) || 0,
        paymentsHandled: (byStaffPayments.get(id) || { count: 0 }).count,
        revenueCollected: (byStaffPayments.get(id) || { revenue: 0 }).revenue,
      })),
    });
  } catch (err) {
    next(err);
  }
}

async function customerHistory(req, res, next) {
  try {
    const orders = await Order.find({ customerPhone: req.params.phone }).sort({ createdAt: -1 });
    res.json(
      orders.map((o) => ({
        id: o._id,
        orderNumber: o.orderNumber,
        businessDate: o.businessDate,
        total: o.total,
        status: o.status,
        createdAt: o.createdAt,
      }))
    );
  } catch (err) {
    next(err);
  }
}

module.exports = { summary, customerHistory };
