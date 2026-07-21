const MenuItem = require("../models/MenuItem");
const Category = require("../models/Category");
const Ingredient = require("../models/Ingredient");
const Supplement = require("../models/Supplement");
const { getIO } = require("../io");

const STATIONS = ["grill", "pizza"];

// An item is effectively available when its manual flag is on AND one unit
// of its recipe can be satisfied by current ingredient stock.
function computeInStock(item, ingredientQtyById) {
  return item.recipe.every((entry) => (ingredientQtyById.get(String(entry.ingredientId)) || 0) >= entry.qty);
}

function itemDTO(item, ingredientQtyById) {
  const inStock = computeInStock(item, ingredientQtyById);
  return {
    id: item._id,
    categoryKey: item.categoryKey,
    name: item.name,
    desc: item.desc,
    photo: item.photo,
    badge: item.badge,
    highlight: item.highlight,
    sizes: item.sizes,
    station: item.station,
    comboConfig: item.comboConfig,
    recipe: item.recipe,
    manualAvailable: item.available,
    inStock,
    available: item.available && inStock,
  };
}

async function getMenu(req, res, next) {
  try {
    const [categories, items, supplements, ingredients] = await Promise.all([
      Category.find().sort({ order: 1 }),
      MenuItem.find().sort({ itemOrder: 1 }),
      Supplement.find().sort({ price: 1 }),
      Ingredient.find(),
    ]);

    const ingredientQtyById = new Map(ingredients.map((i) => [String(i._id), i.qty]));
    const itemsByCategory = new Map();
    for (const it of items) {
      if (!itemsByCategory.has(it.categoryKey)) itemsByCategory.set(it.categoryKey, []);
      itemsByCategory.get(it.categoryKey).push(itemDTO(it, ingredientQtyById));
    }

    res.json({
      categories: categories.map((c) => ({
        key: c.key,
        id: c._id,
        label: c.label,
        order: c.order,
        items: itemsByCategory.get(c.key) || [],
      })),
      supplements,
    });
  } catch (err) {
    next(err);
  }
}

function validateItemBody(body, { partial = false } = {}) {
  const errors = [];
  if (!partial || body.name !== undefined) {
    if (!body.name || !String(body.name).trim()) errors.push("name requis");
  }
  if (!partial || body.categoryKey !== undefined) {
    if (!body.categoryKey) errors.push("categoryKey requis");
  }
  if (!partial || body.sizes !== undefined) {
    if (!Array.isArray(body.sizes) || body.sizes.length === 0) errors.push("au moins une taille requise");
    else if (body.sizes.some((s) => !s.label || typeof s.price !== "number" || s.price < 0))
      errors.push("taille invalide (label + prix requis)");
  }
  if (body.station !== undefined && !STATIONS.includes(body.station)) errors.push("station invalide");
  if (body.recipe !== undefined) {
    if (!Array.isArray(body.recipe)) errors.push("recipe invalide");
    else if (body.recipe.some((r) => !r.ingredientId || typeof r.qty !== "number" || r.qty <= 0))
      errors.push("entrée de recette invalide (ingrédient + quantité > 0)");
  }
  return errors;
}

async function createItem(req, res, next) {
  try {
    const errors = validateItemBody(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(", ") });

    const category = await Category.findOne({ key: req.body.categoryKey });
    if (!category) return res.status(400).json({ error: "Catégorie inconnue" });

    const item = await MenuItem.create({
      categoryKey: req.body.categoryKey,
      itemOrder: req.body.itemOrder ?? (await MenuItem.countDocuments({ categoryKey: req.body.categoryKey })),
      name: String(req.body.name).trim(),
      desc: req.body.desc || "",
      photo: req.body.photo || "",
      badge: req.body.badge || null,
      highlight: !!req.body.highlight,
      sizes: req.body.sizes,
      station: req.body.station || "grill",
      recipe: req.body.recipe || [],
      available: req.body.available !== false,
    });

    getIO().emit("menu:updated", { itemId: item._id });
    res.status(201).json({ id: item._id });
  } catch (err) {
    next(err);
  }
}

async function updateItem(req, res, next) {
  try {
    const errors = validateItemBody(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join(", ") });

    if (req.body.categoryKey) {
      const category = await Category.findOne({ key: req.body.categoryKey });
      if (!category) return res.status(400).json({ error: "Catégorie inconnue" });
    }

    const allowed = ["categoryKey", "itemOrder", "name", "desc", "photo", "badge", "highlight", "sizes", "station", "recipe", "available"];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const item = await MenuItem.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!item) return res.status(404).json({ error: "Article introuvable" });

    getIO().emit("menu:updated", { itemId: item._id });
    res.json({ id: item._id });
  } catch (err) {
    next(err);
  }
}

async function deleteItem(req, res, next) {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: "Article introuvable" });

    getIO().emit("menu:updated", { itemId: item._id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// Manual availability flag only — stock-based unavailability is computed,
// so a manager can always flip this without fighting the stock logic.
async function setAvailability(req, res, next) {
  try {
    const { available } = req.body;
    if (typeof available !== "boolean") {
      return res.status(400).json({ error: "available must be a boolean" });
    }

    const item = await MenuItem.findByIdAndUpdate(req.params.id, { available }, { new: true });
    if (!item) return res.status(404).json({ error: "Article introuvable" });

    getIO().emit("menu:updated", { itemId: item._id });
    res.json({ id: item._id, manualAvailable: item.available });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMenu, createItem, updateItem, deleteItem, setAvailability };
