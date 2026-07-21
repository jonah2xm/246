const MenuItem = require("../models/MenuItem");
const Ingredient = require("../models/Ingredient");
const StockMovement = require("../models/StockMovement");
const { getIO } = require("../io");

// Sum ingredient needs across an order's line items (qty × recipe qty each).
async function requiredIngredients(orderItems) {
  const menuItemIds = orderItems.map((it) => it.menuItemId).filter(Boolean);
  const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });
  const byId = new Map(menuItems.map((mi) => [String(mi._id), mi]));

  const needed = new Map(); // ingredientId -> qty
  for (const it of orderItems) {
    const mi = byId.get(String(it.menuItemId));
    if (!mi) continue;
    for (const entry of mi.recipe) {
      const key = String(entry.ingredientId);
      needed.set(key, (needed.get(key) || 0) + entry.qty * it.qty);
    }
  }
  return needed;
}

// Check an order can be cooked with current stock. Returns the first
// lacking ingredient's name, or null when everything is in stock.
async function findLackingIngredient(orderItems) {
  const needed = await requiredIngredients(orderItems);
  if (needed.size === 0) return null;

  const ingredients = await Ingredient.find({ _id: { $in: [...needed.keys()] } });
  for (const ing of ingredients) {
    if (ing.qty < (needed.get(String(ing._id)) || 0)) return ing.name;
  }
  return null;
}

// sign = -1 consumes stock (kitchen accepted the order), +1 restores it
// (cancellation of an already-consumed order). One movement per ingredient.
async function applyOrderStockDelta(orderItems, { sign, reason, orderId = null, staffId = null }) {
  const needed = await requiredIngredients(orderItems);
  if (needed.size === 0) return;

  for (const [ingredientId, qty] of needed) {
    const ing = await Ingredient.findById(ingredientId);
    if (!ing) continue;

    const newQty = Math.max(0, ing.qty + sign * qty);
    const actualDelta = newQty - ing.qty;
    if (actualDelta === 0) continue;

    ing.qty = newQty;
    await ing.save();
    await StockMovement.create({ ingredientId: ing._id, delta: actualDelta, reason, orderId, staffId });

    if (newQty <= ing.lowThreshold) {
      getIO().to("staff").emit("stock:low", { ingredientId: ing._id, name: ing.name, qty: newQty, lowThreshold: ing.lowThreshold });
    }
  }

  // Ingredient levels changed → effective item availability may have changed.
  getIO().emit("menu:updated", {});
}

async function adjustIngredient(ingredientId, delta, reason, staffId) {
  const ing = await Ingredient.findById(ingredientId);
  if (!ing) return null;

  const newQty = Math.max(0, ing.qty + delta);
  const actualDelta = newQty - ing.qty;
  if (actualDelta !== 0) {
    ing.qty = newQty;
    await ing.save();
    await StockMovement.create({ ingredientId: ing._id, delta: actualDelta, reason, staffId });

    if (newQty <= ing.lowThreshold) {
      getIO().to("staff").emit("stock:low", { ingredientId: ing._id, name: ing.name, qty: newQty, lowThreshold: ing.lowThreshold });
    }
    getIO().emit("menu:updated", {});
  }
  return ing;
}

module.exports = { findLackingIngredient, applyOrderStockDelta, adjustIngredient };
