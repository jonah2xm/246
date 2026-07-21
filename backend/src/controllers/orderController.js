const Order = require("../models/Order");
const MenuItem = require("../models/MenuItem");
const Table = require("../models/Table");
const TableSession = require("../models/TableSession");
const LoyaltyAccount = require("../models/LoyaltyAccount");
const { nextQueueNumber, todayKey } = require("../utils/queueNumber");
const { findLackingIngredient, applyOrderStockDelta } = require("../utils/stock");
const { getIO } = require("../io");

const CONFIRM_SUBTEXT = {
  cash: "Réglez en espèces au comptoir en récupérant votre commande.",
  tpe: "Réglez par carte (TPE) au comptoir en récupérant votre commande.",
};

// Allowed forward transitions of the fulfillment state machine.
const TRANSITIONS = {
  new: ["in_progress", "cancelled"],
  in_progress: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

// Orders scheduled further out than this don't appear on the KDS yet —
// they're released close to their pickup time, not the moment they're placed.
const RELEASE_LEAD_MINUTES = 15;
const LOYALTY_POINTS_PER_DA = 1 / 100;

function publicOrder(order) {
  return {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    payment: { method: order.payment.method, status: order.payment.status },
  };
}

function staffOrder(order, tableLabel = null) {
  return {
    id: order._id,
    orderNumber: order.orderNumber,
    businessDate: order.businessDate,
    mode: order.mode,
    source: order.source,
    sessionId: order.sessionId,
    table: tableLabel,
    items: order.items,
    total: order.total,
    status: order.status,
    statusHistory: order.statusHistory,
    payment: order.payment,
    scheduledFor: order.scheduledFor,
    customerPhone: order.customerPhone,
    createdAt: order.createdAt,
  };
}

// Batch-resolve session ids to table labels ("T3", "T2+T3" when merged).
async function tableLabelsBySession(orders) {
  const sessionIds = [...new Set(orders.map((o) => o.sessionId && String(o.sessionId)).filter(Boolean))];
  if (sessionIds.length === 0) return new Map();

  const sessions = await TableSession.find({ _id: { $in: sessionIds } });
  const tableIds = [...new Set(sessions.flatMap((s) => s.tableIds.map(String)))];
  const tables = await Table.find({ _id: { $in: tableIds } });
  const labelById = new Map(tables.map((t) => [String(t._id), t.label]));

  return new Map(
    sessions.map((s) => [String(s._id), s.tableIds.map((tid) => labelById.get(String(tid)) || "?").join("+")])
  );
}

async function staffOrderWithTable(order) {
  const labels = await tableLabelsBySession([order]);
  return staffOrder(order, order.sessionId ? labels.get(String(order.sessionId)) || null : null);
}

// Resolves an optional table QR slug to an open (or newly opened) session.
// Throws a client error via return value when the slug doesn't match a table.
async function resolveSession(tableSlug) {
  if (!tableSlug) return { session: null };
  const table = await Table.findOne({ qrSlug: tableSlug });
  if (!table) return { invalid: true };

  let session = await TableSession.findOne({ tableIds: table._id, status: "open" });
  if (!session) {
    session = await TableSession.create({ tableIds: [table._id], status: "open" });
  }
  // Ordering from a table always marks it occupied.
  if (table.status !== "occupied") {
    table.status = "occupied";
    await table.save();
    getIO().to("staff").emit("table:updated", { id: table._id, status: table.status });
  }
  return { session };
}

// Shared by order creation and order modification: validates the raw line
// items against the live menu (name+size match, availability, combo rules,
// ingredient stock) and stamps menuItemId/station on each line.
// Returns { status, error } on failure, { items } on success.
async function prepareItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { status: 400, error: "Order must contain at least one item." };
  }
  for (const it of items) {
    if (!it.name || !it.sizeLabel || typeof it.unitPrice !== "number" || !it.qty || it.qty < 1) {
      return { status: 400, error: "Malformed order item." };
    }
  }

  // Menu items are matched by (name, sizeLabel), not name alone — some items
  // (e.g. the two "PIZZA XXL" combo sizes) share a name across separate docs.
  const names = [...new Set(items.map((it) => it.name))];
  const menuItems = await MenuItem.find({ name: { $in: names } });
  function findMenuItem(name, sizeLabel) {
    return menuItems.find((mi) => mi.name === name && mi.sizes.some((s) => s.label === sizeLabel));
  }

  for (const it of items) {
    const mi = findMenuItem(it.name, it.sizeLabel);
    if (!mi) return { status: 400, error: `Article inconnu: ${it.name}` };
    if (!mi.available) return { status: 409, error: `Article épuisé: ${it.name}` };

    if (mi.comboConfig) {
      const selections = Array.isArray(it.comboSelections) ? it.comboSelections : [];
      if (selections.length !== mi.comboConfig.picks) {
        return { status: 400, error: `${it.name}: sélectionnez ${mi.comboConfig.picks} pizzas.` };
      }
      for (const sel of selections) {
        const selItem = await MenuItem.findOne({ name: sel.name });
        if (!selItem || !selItem.available || !mi.comboConfig.eligibleCategoryKeys.includes(selItem.categoryKey)) {
          return { status: 400, error: `Sélection invalide dans ${it.name}: ${sel.name}` };
        }
      }
      it.comboSelections = selections;
    } else {
      it.comboSelections = [];
    }

    it.menuItemId = mi._id;
    it.station = mi.station;
  }

  // Ingredient-level stock check across the whole order.
  const lacking = await findLackingIngredient(items);
  if (lacking) return { status: 409, error: `Stock insuffisant: ${lacking}` };

  return { items };
}

async function createOrder(req, res, next) {
  try {
    const { mode = "table", items, paymentMethod = "cash", tableSlug, scheduledFor, customerPhone, source } = req.body;

    const prepared = await prepareItems(items);
    if (prepared.error) return res.status(prepared.status).json({ error: prepared.error });

    const resolved = await resolveSession(tableSlug);
    if (resolved.invalid) return res.status(400).json({ error: "Table invalide" });
    const session = resolved.session;

    const total = items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
    const { queueNumber, businessDate } = await nextQueueNumber();
    const now = new Date();
    const scheduledDate = scheduledFor ? new Date(scheduledFor) : null;

    const order = await Order.create({
      orderNumber: queueNumber,
      businessDate,
      mode: mode === "delivery" ? "delivery" : "table",
      source: source === "counter" ? "counter" : "qr",
      sessionId: session ? session._id : null,
      items,
      total,
      status: "new",
      statusHistory: [{ status: "new", at: now }],
      payment: {
        method: paymentMethod === "tpe" ? "tpe" : "cash",
        status: "pending",
      },
      scheduledFor: scheduledDate && !Number.isNaN(scheduledDate.getTime()) ? scheduledDate : null,
      customerPhone: customerPhone || null,
    });

    let loyaltyPoints = null;
    if (customerPhone) {
      const earned = Math.round(total * LOYALTY_POINTS_PER_DA);
      const account = await LoyaltyAccount.findOneAndUpdate(
        { phone: customerPhone },
        { $inc: { points: earned }, $push: { history: { orderId: order._id, pointsDelta: earned, at: now } } },
        { new: true, upsert: true }
      );
      loyaltyPoints = { earned, balance: account.points };
    }

    // Only push to the live KDS feed immediately if it's not scheduled far in the future.
    const isDueSoon =
      !order.scheduledFor || order.scheduledFor.getTime() - now.getTime() <= RELEASE_LEAD_MINUTES * 60000;
    if (isDueSoon) {
      getIO().to("staff").emit("order:new", await staffOrderWithTable(order));
    }

    res.status(201).json({
      orderId: order._id,
      orderNumber: order.orderNumber,
      total: order.total,
      paymentMethod: order.payment.method,
      confirmSubtext: CONFIRM_SUBTEXT[order.payment.method],
      scheduledFor: order.scheduledFor,
      loyaltyPoints,
    });
  } catch (err) {
    next(err);
  }
}

// KDS feed: today's not-yet-archived orders in active states, released near pickup time.
async function listActive(req, res, next) {
  try {
    const now = new Date();
    const releaseCutoff = new Date(now.getTime() + RELEASE_LEAD_MINUTES * 60000);
    const orders = await Order.find({
      businessDate: todayKey(),
      status: { $in: ["new", "in_progress", "ready"] },
      $or: [{ scheduledFor: null }, { scheduledFor: { $lte: releaseCutoff } }],
    }).sort({ createdAt: 1 });

    const labels = await tableLabelsBySession(orders);
    res.json(orders.map((o) => staffOrder(o, o.sessionId ? labels.get(String(o.sessionId)) || null : null)));
  } catch (err) {
    next(err);
  }
}

// Cashier view: everything from today, newest first.
async function listToday(req, res, next) {
  try {
    const orders = await Order.find({ businessDate: todayKey() }).sort({ createdAt: -1 });
    const labels = await tableLabelsBySession(orders);
    res.json(orders.map((o) => staffOrder(o, o.sessionId ? labels.get(String(o.sessionId)) || null : null)));
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const from = order.status;
    if (!TRANSITIONS[from] || !TRANSITIONS[from].includes(status)) {
      return res.status(409).json({ error: `Transition ${from} → ${status} non autorisée` });
    }

    order.status = status;
    order.statusHistory.push({ status, at: new Date(), byStaffId: req.staff.id });
    if (status === "completed") order.archivedAt = new Date();
    await order.save();

    // Ingredients leave the shelf the moment the kitchen commits to cooking,
    // and come back if a committed order is later cancelled.
    if (from === "new" && status === "in_progress") {
      await applyOrderStockDelta(order.items, { sign: -1, reason: "sale", orderId: order._id, staffId: req.staff.id });
    } else if ((from === "in_progress" || from === "ready") && status === "cancelled") {
      await applyOrderStockDelta(order.items, {
        sign: 1,
        reason: "cancel_refund",
        orderId: order._id,
        staffId: req.staff.id,
      });
    }

    const dto = await staffOrderWithTable(order);
    getIO().to("staff").emit("order:updated", dto);
    getIO().to(`order:${order._id}`).emit("order:status", publicOrder(order));

    res.json(dto);
  } catch (err) {
    next(err);
  }
}

// When every order of a table session is settled, the table frees itself.
async function releaseSessionIfSettled(sessionId) {
  const hasUnpaid = await Order.exists({
    sessionId,
    status: { $ne: "cancelled" },
    "payment.status": "pending",
  });
  if (hasUnpaid) return;

  const session = await TableSession.findById(sessionId);
  if (!session || session.status !== "open") return;

  session.status = "closed";
  session.closedAt = new Date();
  await session.save();
  await Table.updateMany({ _id: { $in: session.tableIds } }, { status: "free" });
  getIO().to("staff").emit("table:closed", { sessionId: session._id, tableIds: session.tableIds });
}

async function markPaid(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.payment.status === "paid") {
      return res.status(409).json({ error: "Commande déjà encaissée" });
    }

    order.payment.status = "paid";
    order.payment.paidAt = new Date();
    order.payment.byStaffId = req.staff.id;
    await order.save();

    if (order.sessionId) {
      await releaseSessionIfSettled(order.sessionId);
    }

    const dto = await staffOrderWithTable(order);
    getIO().to("staff").emit("order:updated", dto);
    getIO().to(`order:${order._id}`).emit("order:status", publicOrder(order));

    res.json(dto);
  } catch (err) {
    next(err);
  }
}

// Caisse edits an order's line items (customer changed their mind at the
// counter). Only before the kitchen starts and before payment — after that,
// cancel/refund is the correct path, not silent rewriting.
async function updateItems(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "new") {
      return res.status(409).json({ error: "La cuisine a déjà commencé — modification impossible. Annulez la commande." });
    }
    if (order.payment.status === "paid") {
      return res.status(409).json({ error: "Commande déjà encaissée — modification impossible." });
    }

    const prepared = await prepareItems(req.body.items);
    if (prepared.error) return res.status(prepared.status).json({ error: prepared.error });

    order.items = prepared.items;
    order.total = prepared.items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
    await order.save();

    const dto = await staffOrderWithTable(order);
    getIO().to("staff").emit("order:updated", dto);
    getIO().to(`order:${order._id}`).emit("order:status", publicOrder(order));

    res.json(dto);
  } catch (err) {
    next(err);
  }
}

// Customer-facing status (no auth) — exposes only what the customer needs.
async function getPublicStatus(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(publicOrder(order));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrder,
  listActive,
  listToday,
  updateStatus,
  updateItems,
  markPaid,
  getPublicStatus,
  TRANSITIONS,
};
