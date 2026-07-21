const Ingredient = require("../models/Ingredient");
const MenuItem = require("../models/MenuItem");
const { adjustIngredient } = require("../utils/stock");
const { getIO } = require("../io");

async function listIngredients(req, res, next) {
  try {
    const ingredients = await Ingredient.find().sort({ name: 1 });
    res.json(ingredients);
  } catch (err) {
    next(err);
  }
}

async function createIngredient(req, res, next) {
  try {
    const { name, unit = "pcs", qty = 0, lowThreshold = 10 } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ error: "name requis" });
    if (await Ingredient.findOne({ name: String(name).trim() })) {
      return res.status(409).json({ error: "Cet ingrédient existe déjà" });
    }

    const ingredient = await Ingredient.create({
      name: String(name).trim(),
      unit,
      qty: Math.max(0, Number(qty) || 0),
      lowThreshold: Math.max(0, Number(lowThreshold) || 0),
    });
    getIO().emit("menu:updated", {});
    res.status(201).json(ingredient);
  } catch (err) {
    next(err);
  }
}

async function updateIngredient(req, res, next) {
  try {
    const { name, unit, lowThreshold } = req.body;
    const update = {};
    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ error: "name invalide" });
      update.name = String(name).trim();
    }
    if (unit !== undefined) update.unit = unit;
    if (lowThreshold !== undefined) update.lowThreshold = Math.max(0, Number(lowThreshold) || 0);

    const ingredient = await Ingredient.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!ingredient) return res.status(404).json({ error: "Ingrédient introuvable" });
    res.json(ingredient);
  } catch (err) {
    next(err);
  }
}

// Quantity changes go through the movement ledger, not a raw field edit.
async function adjustStock(req, res, next) {
  try {
    const { delta, reason = "adjustment" } = req.body;
    if (typeof delta !== "number" || delta === 0) {
      return res.status(400).json({ error: "delta must be a non-zero number" });
    }
    if (!["adjustment", "waste"].includes(reason)) {
      return res.status(400).json({ error: "reason must be adjustment or waste" });
    }

    const ingredient = await adjustIngredient(req.params.id, delta, reason, req.staff.id);
    if (!ingredient) return res.status(404).json({ error: "Ingrédient introuvable" });
    res.json(ingredient);
  } catch (err) {
    next(err);
  }
}

async function deleteIngredient(req, res, next) {
  try {
    const usedBy = await MenuItem.countDocuments({ "recipe.ingredientId": req.params.id });
    if (usedBy > 0) {
      return res.status(409).json({ error: `Impossible: utilisé dans ${usedBy} recette(s). Retirez-le d'abord.` });
    }

    const ingredient = await Ingredient.findByIdAndDelete(req.params.id);
    if (!ingredient) return res.status(404).json({ error: "Ingrédient introuvable" });
    getIO().emit("menu:updated", {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listIngredients, createIngredient, updateIngredient, adjustStock, deleteIngredient };
