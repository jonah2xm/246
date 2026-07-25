require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const Order = require("../src/models/Order");
const TableSession = require("../src/models/TableSession");
const Table = require("../src/models/Table");
const Staff = require("../src/models/Staff");
const MenuItem = require("../src/models/MenuItem");
const Ingredient = require("../src/models/Ingredient");
const Supplement = require("../src/models/Supplement");
const StockMovement = require("../src/models/StockMovement");
const Counter = require("../src/models/Counter");

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function minutesAgo(n) {
  return new Date(Date.now() - n * 60000);
}

async function nextOrderNumber(businessDate) {
  const counter = await Counter.findOneAndUpdate(
    { _id: `queue-${businessDate}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

// Bypasses Mongoose's timestamps plugin so sample data can carry realistic
// createdAt/updatedAt values instead of "right now".
async function insertAt(Model, doc, when) {
  const created = await Model.create(doc);
  await Model.collection.updateOne({ _id: created._id }, { $set: { createdAt: when, updatedAt: when } });
  return created;
}

function pickSize(menuItem, label = null) {
  if (label) return menuItem.sizes.find((s) => s.label === label) || menuItem.sizes[0];
  return menuItem.sizes[0];
}

function lineItem(menuItem, { qty = 1, sizeLabel = null, supplements = [], comboPicks = null } = {}) {
  const size = pickSize(menuItem, sizeLabel);
  return {
    menuItemId: menuItem._id,
    name: menuItem.name,
    sizeLabel: size.label,
    unitPrice: size.price,
    qty,
    supplements,
    station: menuItem.station,
    comboSelections: comboPicks ? comboPicks.map((mi) => ({ name: mi.name, sizeLabel: mi.sizes[0].label })) : [],
  };
}

function total(items) {
  return items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
}

function history(entries) {
  // entries: [status, minutesAgoNum, staffId]
  return entries.map(([status, minsAgo, staffId]) => ({ status, at: minutesAgo(minsAgo), byStaffId: staffId || null }));
}

// Mirrors utils/stock.js applyOrderStockDelta, without the socket emit
// (there's no live server/io in a standalone seed run).
async function moveStock(items, { sign, reason, orderId, staffId, at }) {
  const menuIds = items.map((it) => it.menuItemId).filter(Boolean);
  const menuItems = await MenuItem.find({ _id: { $in: menuIds } });
  const byId = new Map(menuItems.map((mi) => [String(mi._id), mi]));

  const needed = new Map();
  for (const it of items) {
    const mi = byId.get(String(it.menuItemId));
    if (!mi) continue;
    for (const entry of mi.recipe) {
      const key = String(entry.ingredientId);
      needed.set(key, (needed.get(key) || 0) + entry.qty * it.qty);
    }
  }

  for (const [ingredientId, qty] of needed) {
    const ing = await Ingredient.findById(ingredientId);
    if (!ing) continue;
    const newQty = Math.max(0, ing.qty + sign * qty);
    const actualDelta = newQty - ing.qty;
    if (actualDelta === 0) continue;
    ing.qty = newQty;
    await ing.save();
    await insertAt(StockMovement, { ingredientId: ing._id, delta: actualDelta, reason, orderId, staffId }, at);
  }
}

async function seed() {
  await connectDB();

  const tables = await Table.find({});
  const staff = await Staff.find({});
  const menuItems = await MenuItem.find({});
  const supplements = await Supplement.find({});

  if (!tables.length || !staff.length || !menuItems.length) {
    throw new Error("No tables/staff/menu items found — run `node seed/seed.js` first.");
  }

  await Order.deleteMany({});
  await TableSession.deleteMany({});
  await StockMovement.deleteMany({});
  await Counter.deleteMany({});
  await Table.updateMany({}, { $set: { status: "free" } });

  const byLabel = Object.fromEntries(tables.map((t) => [t.label, t]));
  const staffByRole = Object.fromEntries(staff.map((s) => [s.role, s]));
  const menu = (name) => menuItems.find((mi) => mi.name === name);
  const megaDuo = menuItems.find((mi) => mi.name === "Duo" && mi.comboConfig?.picks === 2);
  const supplementLabel = (key) => supplements.find((s) => s.key === key)?.label;

  // So Pizz catalog items (see seed/menuData.json).
  const chicken = menu("Chicken");
  const chorizo = menu("Chorizo");
  const leClassic = menu("Le Classic");
  const leBeef = menu("Le Beef");
  const pates = menu("Pâtes Carbonara");
  const margarita = menu("Margarita");
  const vegetarienne = menu("Végétarienne");
  const tonata = menu("Tonata");
  const laChef = menu("La Chef");

  const today = dateKey(new Date());
  const yesterday = dateKey(new Date(Date.now() - 24 * 3600 * 1000));

  const cashier = staffByRole.cashier;
  const kitchen = staffByRole.kitchen;

  // --- Table sessions -------------------------------------------------

  const sessA = await insertAt(
    TableSession,
    { tableIds: [byLabel.T1._id], status: "closed", openedAt: minutesAgo(180), closedAt: minutesAgo(90), assignedStaffId: cashier._id },
    minutesAgo(180)
  );
  const sessB = await insertAt(
    TableSession,
    { tableIds: [byLabel.T2._id], status: "open", openedAt: minutesAgo(25), assignedStaffId: cashier._id },
    minutesAgo(25)
  );
  const sessC = await insertAt(
    TableSession,
    { tableIds: [byLabel.T3._id], status: "open", openedAt: minutesAgo(6), assignedStaffId: cashier._id },
    minutesAgo(6)
  );
  const sessD = await insertAt(
    TableSession,
    { tableIds: [byLabel.T4._id, byLabel.T5._id], status: "open", openedAt: minutesAgo(45), assignedStaffId: cashier._id },
    minutesAgo(45)
  );
  const sessE = await insertAt(
    TableSession,
    {
      tableIds: [byLabel.T6._id],
      status: "closed",
      openedAt: minutesAgo(24 * 60 + 120),
      closedAt: minutesAgo(24 * 60 + 45),
      assignedStaffId: cashier._id,
    },
    minutesAgo(24 * 60 + 120)
  );

  await Table.updateOne({ _id: byLabel.T2._id }, { $set: { status: "occupied" } });
  await Table.updateOne({ _id: byLabel.T3._id }, { $set: { status: "occupied" } });
  await Table.updateOne({ _id: byLabel.T4._id }, { $set: { status: "occupied" } });
  await Table.updateOne({ _id: byLabel.T5._id }, { $set: { status: "occupied" } });

  // --- Orders -----------------------------------------------------------

  // T1, closed session: one completed + one cancelled-before-cooking order.
  const a1Items = [
    lineItem(chicken, { qty: 2, supplements: [supplementLabel("vh")] }),
    lineItem(leClassic, { qty: 1 }),
  ];
  const a1 = await insertAt(
    Order,
    {
      orderNumber: await nextOrderNumber(today),
      businessDate: today,
      mode: "table",
      source: "qr",
      sessionId: sessA._id,
      items: a1Items,
      total: total(a1Items),
      status: "completed",
      statusHistory: history([
        ["new", 175],
        ["in_progress", 170, kitchen._id],
        ["ready", 155, kitchen._id],
        ["completed", 150, cashier._id],
      ]),
      payment: { method: "cash", status: "paid", paidAt: minutesAgo(150), byStaffId: cashier._id },
    },
    minutesAgo(175)
  );
  await moveStock(a1Items, { sign: -1, reason: "sale", orderId: a1._id, staffId: kitchen._id, at: minutesAgo(170) });

  const a2Items = [lineItem(pates, { qty: 1 })];
  await insertAt(
    Order,
    {
      orderNumber: await nextOrderNumber(today),
      businessDate: today,
      mode: "table",
      source: "qr",
      sessionId: sessA._id,
      items: a2Items,
      total: total(a2Items),
      status: "cancelled",
      statusHistory: history([
        ["new", 140],
        ["cancelled", 138, cashier._id],
      ]),
      payment: { method: "cash", status: "pending" },
    },
    minutesAgo(140)
  );

  // T2, open session: kitchen is currently cooking this one.
  const b1Items = [
    lineItem(leBeef, { qty: 1, supplements: [supplementLabel("creme-fraiche")] }),
    lineItem(margarita, { qty: 1 }),
  ];
  const b1 = await insertAt(
    Order,
    {
      orderNumber: await nextOrderNumber(today),
      businessDate: today,
      mode: "table",
      source: "qr",
      sessionId: sessB._id,
      items: b1Items,
      total: total(b1Items),
      status: "in_progress",
      statusHistory: history([
        ["new", 22],
        ["in_progress", 18, kitchen._id],
      ]),
      payment: { method: "tpe", status: "pending" },
    },
    minutesAgo(22)
  );
  await moveStock(b1Items, { sign: -1, reason: "sale", orderId: b1._id, staffId: kitchen._id, at: minutesAgo(18) });

  // T3, open session: order just placed, not yet accepted by the kitchen.
  const c1Items = [lineItem(tonata, { qty: 1 }), lineItem(pates, { qty: 2 })];
  await insertAt(
    Order,
    {
      orderNumber: await nextOrderNumber(today),
      businessDate: today,
      mode: "table",
      source: "qr",
      sessionId: sessC._id,
      items: c1Items,
      total: total(c1Items),
      status: "new",
      statusHistory: history([["new", 5]]),
      payment: { method: "cash", status: "pending" },
    },
    minutesAgo(5)
  );

  // T4+T5 merged session: combo pizza order, ready for pickup.
  const d1Items = [
    lineItem(megaDuo, { qty: 1, comboPicks: [margarita, vegetarienne] }),
    lineItem(leClassic, { qty: 1 }),
  ];
  const d1 = await insertAt(
    Order,
    {
      orderNumber: await nextOrderNumber(today),
      businessDate: today,
      mode: "table",
      source: "qr",
      sessionId: sessD._id,
      items: d1Items,
      total: total(d1Items),
      status: "ready",
      statusHistory: history([
        ["new", 42],
        ["in_progress", 38, kitchen._id],
        ["ready", 20, kitchen._id],
      ]),
      payment: { method: "tpe", status: "pending" },
    },
    minutesAgo(42)
  );
  await moveStock(d1Items, { sign: -1, reason: "sale", orderId: d1._id, staffId: kitchen._id, at: minutesAgo(38) });

  // Counter/delivery orders, no table session attached.
  const e1Items = [lineItem(laChef, { qty: 1 }), lineItem(chorizo, { qty: 1 })];
  const e1 = await insertAt(
    Order,
    {
      orderNumber: await nextOrderNumber(today),
      businessDate: today,
      mode: "delivery",
      source: "counter",
      sessionId: null,
      items: e1Items,
      total: total(e1Items),
      status: "completed",
      statusHistory: history([
        ["new", 100],
        ["in_progress", 95, kitchen._id],
        ["ready", 75, kitchen._id],
        ["completed", 70, cashier._id],
      ]),
      payment: { method: "tpe", status: "paid", paidAt: minutesAgo(70), byStaffId: cashier._id },
      customerPhone: "0555123456",
    },
    minutesAgo(100)
  );
  await moveStock(e1Items, { sign: -1, reason: "sale", orderId: e1._id, staffId: kitchen._id, at: minutesAgo(95) });

  // Cancelled after the kitchen had already started it — demonstrates the
  // cancel_refund stock movement (consumed, then given back).
  const e2Items = [lineItem(leBeef, { qty: 1 })];
  const e2 = await insertAt(
    Order,
    {
      orderNumber: await nextOrderNumber(today),
      businessDate: today,
      mode: "delivery",
      source: "counter",
      sessionId: null,
      items: e2Items,
      total: total(e2Items),
      status: "cancelled",
      statusHistory: history([
        ["new", 60],
        ["in_progress", 59, kitchen._id],
        ["cancelled", 58, cashier._id],
      ]),
      payment: { method: "cash", status: "pending" },
    },
    minutesAgo(60)
  );
  await moveStock(e2Items, { sign: -1, reason: "sale", orderId: e2._id, staffId: kitchen._id, at: minutesAgo(59) });
  await moveStock(e2Items, { sign: 1, reason: "cancel_refund", orderId: e2._id, staffId: cashier._id, at: minutesAgo(58) });

  // Yesterday, for analytics/history screens (?date=YYYY-MM-DD).
  const f1Items = [lineItem(margarita, { qty: 2 })];
  const f1 = await insertAt(
    Order,
    {
      orderNumber: await nextOrderNumber(yesterday),
      businessDate: yesterday,
      mode: "table",
      source: "qr",
      sessionId: sessE._id,
      items: f1Items,
      total: total(f1Items),
      status: "completed",
      statusHistory: history([
        ["new", 24 * 60 + 120],
        ["in_progress", 24 * 60 + 115, kitchen._id],
        ["ready", 24 * 60 + 95, kitchen._id],
        ["completed", 24 * 60 + 90, cashier._id],
      ]),
      payment: { method: "cash", status: "paid", paidAt: minutesAgo(24 * 60 + 90), byStaffId: cashier._id },
    },
    minutesAgo(24 * 60 + 120)
  );
  await moveStock(f1Items, { sign: -1, reason: "sale", orderId: f1._id, staffId: kitchen._id, at: minutesAgo(24 * 60 + 115) });

  console.log("Seeded 5 table sessions (T1 closed, T2/T3 open, T4+T5 merged open, T6 closed-yesterday).");
  console.log("Seeded 8 orders: 1 new, 1 in_progress, 1 ready, 3 completed, 2 cancelled.");
  // moveStock is a no-op here: So Pizz menu items carry no recipe, so orders
  // don't consume ingredient stock. Inventory levels come from seed.js.
  console.log("Note: menu items have no recipe, so no stock movements were recorded.");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
