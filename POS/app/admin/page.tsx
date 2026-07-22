"use client";

import { useCallback, useEffect, useState } from "react";
import RoleGate from "@/components/RoleGate";
import TopBar from "@/components/TopBar";
import Modal, { Field, inputCls, btnPrimary, btnGhost, btnDanger } from "@/components/Modal";
import { useAuth } from "@/lib/auth-context";
import {
  getMenuAdmin,
  setItemAvailability,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listIngredients,
  createIngredient,
  updateIngredient,
  adjustIngredient,
  deleteIngredient,
  uploadImage,
} from "@/lib/api";
import { getSocket } from "@/lib/socket";
import PhotoTile from "@/components/PhotoTile";
import { hueForName } from "@/lib/placeholder";
import { CategoryAdmin, CategoryInfo, Ingredient, MenuItemAdmin, RecipeEntry } from "@/lib/types";

type Tab = "items" | "categories" | "ingredients";

function MenuAdmin() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>("items");
  const [categories, setCategories] = useState<CategoryAdmin[]>([]);
  const [categoryList, setCategoryList] = useState<CategoryInfo[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const [menu, cats, ings] = await Promise.all([
        getMenuAdmin(token),
        listCategories(token),
        listIngredients(token),
      ]);
      setCategories(menu.categories);
      setCategoryList(cats);
      setIngredients(ings);
      setError(null);
    } catch {
      setError("Impossible de charger les données.");
    }
  }, [token]);

  useEffect(() => {
    refresh();
    if (!token) return;
    const socket = getSocket(token);
    socket.on("menu:updated", refresh);
    socket.on("stock:low", refresh);
    return () => {
      socket.off("menu:updated", refresh);
      socket.off("stock:low", refresh);
    };
  }, [token, refresh]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "items", label: "Articles" },
    { key: "categories", label: "Catégories" },
    { key: "ingredients", label: "Ingrédients" },
  ];

  return (
    <div className="min-h-screen">
      <TopBar />
      <div className="flex items-center gap-1.5 rounded-2xl bg-panel-2 p-1.5 mx-5 mt-4 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`min-h-12 rounded-xl px-7 py-3 font-display text-lg tracking-wide transition-colors motion-safe:active:scale-95 ${tab === t.key ? "bg-green text-[#08130a]" : "text-muted hover:bg-panel hover:text-fg"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="mx-5 mt-3 rounded-xl bg-red-soft px-4 py-2.5 text-sm text-red">{error}</div>}

      {tab === "items" && (
        <ItemsTab
          categories={categories}
          categoryList={categoryList}
          ingredients={ingredients}
          onChanged={refresh}
          onError={setError}
        />
      )}
      {tab === "categories" && <CategoriesTab categoryList={categoryList} onChanged={refresh} onError={setError} />}
      {tab === "ingredients" && <IngredientsTab ingredients={ingredients} onChanged={refresh} onError={setError} />}
    </div>
  );
}

/* ------------------------------- Articles ------------------------------- */

function ItemsTab({
  categories,
  categoryList,
  ingredients,
  onChanged,
  onError,
}: {
  categories: CategoryAdmin[];
  categoryList: CategoryInfo[];
  ingredients: Ingredient[];
  onChanged: () => void;
  onError: (e: string | null) => void;
}) {
  const { token } = useAuth();
  const [editing, setEditing] = useState<MenuItemAdmin | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>("all");

  const ingredientName = (id: string) => ingredients.find((i) => i._id === id)?.name || "?";
  const visibleCategories = filterCat === "all" ? categories : categories.filter((c) => c.key === filterCat);
  const totalCount = categories.reduce((s, c) => s + c.items.length, 0);

  async function toggle(item: MenuItemAdmin) {
    if (!token) return;
    setBusyId(item.id);
    try {
      await setItemAvailability(token, item.id, !item.manualAvailable);
      onChanged();
    } catch {
      onError("Échec de la mise à jour.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: MenuItemAdmin) {
    if (!token) return;
    if (!confirm(`Supprimer "${item.name}" du menu ?`)) return;
    try {
      await deleteMenuItem(token, item.id);
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Échec de la suppression.");
    }
  }

  return (
    <div className="flex flex-col gap-8 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full select-none touch-pan-x">

          <button
            onClick={() => setFilterCat("all")}
            className={`flex-none min-h-12 rounded-full px-5 py-3 text-sm font-semibold transition-all motion-safe:active:scale-95 ${filterCat === "all"
                ? "bg-green text-[#08130a] shadow-md shadow-green/20"
                : "border border-border bg-panel text-muted hover:text-fg hover:border-green/50"
              }`}
          >
            Toutes ({totalCount})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setFilterCat(cat.key)}
              className={`flex-none min-h-12 rounded-full px-5 py-3 text-sm font-semibold transition-all motion-safe:active:scale-95 ${filterCat === cat.key
                  ? "bg-green text-[#08130a] shadow-md shadow-green/20"
                  : "border border-border bg-panel text-muted hover:text-fg hover:border-green/50"
                }`}
            >
              {cat.label} ({cat.items.length})
            </button>
          ))}
        </div>
        <button onClick={() => setEditing("new")} className={`${btnPrimary} shrink-0`}>
          + Nouvel article
        </button>
      </div>

      {visibleCategories.map((cat) => (
        <div key={cat.key}>
          <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-2.5 pt-2">
            <div className="flex items-center gap-3">
              <span className="h-6 w-1.5 rounded-full bg-green" />
              <h2 className="font-display text-2xl tracking-wide text-fg">{cat.label}</h2>
              <span className="rounded-full border border-border bg-panel-2 px-3 py-0.5 text-xs font-semibold text-muted">
                {cat.items.length} article(s)
              </span>
            </div>
          </div>

          {cat.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
              Aucun article dans cette catégorie.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {cat.items.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col overflow-hidden rounded-2xl border transition-colors ${!item.inStock ? "border-orange" : "border-border"
                    } bg-panel`}
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-panel-2">
                    <PhotoTile src={item.photo} name={item.name} />
                    {item.comboConfig && (
                      <span className="absolute left-2 top-2 rounded-full bg-green px-2.5 py-1 text-[10px] font-bold text-[#08130a]">
                        COMBO {item.comboConfig.picks}
                      </span>
                    )}
                    {item.highlight && (
                      <span className="absolute right-2 top-2 rounded-full bg-panel/90 px-2.5 py-1 text-[10px] font-bold text-green">
                        ★
                      </span>
                    )}
                    {!item.inStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/65">
                        <span className="rounded-full bg-red px-3 py-1.5 text-xs font-bold text-white">RUPTURE STOCK</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-2.5 p-3.5">
                    <div>
                      <div className="font-display text-lg leading-tight">{item.name}</div>
                      <div className="mt-1 text-sm font-semibold text-green">
                        {item.sizes.map((s) => `${s.price} DA`).join(" / ")}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                        {item.station}
                      </span>
                      {item.recipe.length > 0 && (
                        <span
                          className="truncate rounded-full border border-border px-2 py-0.5 text-[10px] text-muted"
                          title={item.recipe.map((r) => `${r.qty}× ${ingredientName(r.ingredientId)}`).join(", ")}
                        >
                          {item.recipe.length} ingrédient(s)
                        </span>
                      )}
                    </div>

                    <div className="mt-auto flex flex-col gap-2 pt-1">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditing(item)}
                          className="flex h-11 flex-1 items-center justify-center rounded-xl border border-border text-sm font-medium text-muted transition-colors motion-safe:active:scale-95 hover:border-green hover:text-fg"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          aria-label="Supprimer"
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-base text-muted transition-colors motion-safe:active:scale-95 hover:border-red hover:text-red"
                        >
                          🗑
                        </button>
                      </div>
                      <button
                        onClick={() => toggle(item)}
                        disabled={busyId === item.id}
                        className={`h-11 rounded-xl text-sm font-semibold transition-colors motion-safe:active:scale-[0.97] disabled:opacity-60 ${item.manualAvailable
                            ? "bg-green text-[#08130a]"
                            : "border border-border bg-panel-2 text-muted"
                          }`}
                      >
                        {item.manualAvailable ? "Disponible" : "Épuisé — réactiver"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {editing && (
        <ItemFormModal
          item={editing === "new" ? null : editing}
          categoryList={categoryList}
          ingredients={ingredients}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
          onError={onError}
        />
      )}
    </div>
  );
}

function ItemFormModal({
  item,
  categoryList,
  ingredients,
  onClose,
  onSaved,
  onError,
}: {
  item: MenuItemAdmin | null;
  categoryList: CategoryInfo[];
  ingredients: Ingredient[];
  onClose: () => void;
  onSaved: () => void;
  onError: (e: string | null) => void;
}) {
  const { token } = useAuth();
  const [name, setName] = useState(item?.name || "");
  const [desc, setDesc] = useState(item?.desc || "");
  const [categoryKey, setCategoryKey] = useState(item?.categoryKey || categoryList[0]?.key || "");
  const [station, setStation] = useState(item?.station || "grill");
  const [photo, setPhoto] = useState(item?.photo || "");
  const [uploading, setUploading] = useState(false);
  const [badge, setBadge] = useState(item?.badge || "");
  const [highlight, setHighlight] = useState(item?.highlight || false);
  const [sizes, setSizes] = useState<{ label: string; price: number }[]>(
    item?.sizes?.length ? item.sizes.map((s) => ({ ...s })) : [{ label: "Prix", price: 0 }]
  );
  const [recipe, setRecipe] = useState<RecipeEntry[]>(item?.recipe?.map((r) => ({ ...r })) || []);
  const [saving, setSaving] = useState(false);

  function setSize(idx: number, patch: Partial<{ label: string; price: number }>) {
    setSizes((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function setRecipeEntry(idx: number, patch: Partial<RecipeEntry>) {
    setRecipe((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  const unusedIngredients = ingredients.filter((i) => !recipe.some((r) => r.ingredientId === i._id));

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        desc,
        categoryKey,
        station,
        photo,
        badge: badge.trim() || null,
        highlight,
        sizes: sizes.filter((s) => s.label.trim()).map((s) => ({ label: s.label.trim(), price: Number(s.price) || 0 })),
        recipe: recipe.filter((r) => r.ingredientId && r.qty > 0),
      };
      if (item) await updateMenuItem(token, item.id, body);
      else await createMenuItem(token, body);
      onError(null);
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={item ? `Modifier — ${item.name}` : "Nouvel article"} onClose={onClose} size="xwide">
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="flex shrink-0 flex-col gap-2.5">
          <div className="relative h-36 w-36 overflow-hidden rounded-2xl border border-border bg-panel-2">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="Aperçu" className="h-full w-full object-cover" />
            ) : (
              <PhotoTile src={undefined} name={name || "?"} />
            )}
          </div>
          <label className={`${btnGhost} block cursor-pointer text-center ${uploading ? "opacity-60" : ""}`}>
            {uploading ? "Envoi…" : photo ? "Changer" : "Importer"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file || !token) return;
                setUploading(true);
                try {
                  const { url } = await uploadImage(token, file);
                  setPhoto(url);
                  onError(null);
                } catch (err) {
                  onError(err instanceof Error ? err.message : "Échec de l'upload.");
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
          {photo && (
            <button onClick={() => setPhoto("")} className="text-xs text-muted transition-colors hover:text-red">
              Retirer la photo
            </button>
          )}
          <span className="text-[10px] leading-tight text-muted">JPEG, PNG ou WebP · 5 Mo max</span>
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <Field label="Nom">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="BIG CLASSIC" />
          </Field>
          <Field label="Description">
            <input value={desc} onChange={(e) => setDesc(e.target.value)} className={inputCls} placeholder="Steak, fromage…" />
          </Field>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Catégorie</div>
        <div className="flex flex-wrap gap-2">
          {categoryList.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategoryKey(c.key)}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors motion-safe:active:scale-95 ${categoryKey === c.key ? "border-green bg-green-soft text-green" : "border-border text-muted hover:text-fg"
                }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Station cuisine</div>
        <div className="flex gap-2">
          {(["grill", "pizza"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStation(s)}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium capitalize transition-colors motion-safe:active:scale-95 ${station === s ? "border-green bg-green-soft text-green" : "border-border text-muted hover:text-fg"
                }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Badge (facultatif)">
          <input value={badge} onChange={(e) => setBadge(e.target.value)} className={inputCls} placeholder="NOUVEAU" />
        </Field>
        <label className="flex items-end gap-2 pb-2.5 text-sm">
          <input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} className="h-4 w-4" />
          Mettre en avant (bordure verte)
        </label>
      </div>

      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Tailles & prix</div>
        <div className="flex flex-col gap-2">
          {sizes.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                value={s.label}
                onChange={(e) => setSize(idx, { label: e.target.value })}
                className={`${inputCls} flex-1`}
                placeholder="Prix / L / XL…"
              />
              <input
                type="number"
                value={s.price}
                onChange={(e) => setSize(idx, { price: Number(e.target.value) })}
                className={`${inputCls} w-28`}
                placeholder="DA"
              />
              <span className="text-xs text-muted">DA</span>
              <button
                onClick={() => setSizes((prev) => prev.filter((_, i) => i !== idx))}
                disabled={sizes.length === 1}
                className="text-lg text-muted transition-colors hover:text-red disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          ))}
          <button onClick={() => setSizes((prev) => [...prev, { label: "", price: 0 }])} className={btnGhost}>
            + Ajouter une taille
          </button>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Recette — stock consommé par unité vendue
        </div>
        <div className="flex flex-col gap-2">
          {recipe.map((r, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select
                value={r.ingredientId}
                onChange={(e) => setRecipeEntry(idx, { ingredientId: e.target.value })}
                className={`${inputCls} flex-1`}
              >
                {ingredients.map((i) => (
                  <option key={i._id} value={i._id}>
                    {i.name} ({i.qty} {i.unit} en stock)
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                step={0.5}
                value={r.qty}
                onChange={(e) => setRecipeEntry(idx, { qty: Number(e.target.value) })}
                className={`${inputCls} w-24`}
              />
              <button
                onClick={() => setRecipe((prev) => prev.filter((_, i) => i !== idx))}
                className="text-lg text-muted transition-colors hover:text-red"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              unusedIngredients[0] && setRecipe((prev) => [...prev, { ingredientId: unusedIngredients[0]._id, qty: 1 }])
            }
            disabled={unusedIngredients.length === 0}
            className={btnGhost}
          >
            + Ajouter un ingrédient
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-2.5 border-t border-border pt-4">
        <button onClick={onClose} className={btnGhost}>
          Annuler
        </button>
        <button onClick={handleSave} disabled={saving || !name.trim() || !categoryKey} className={btnPrimary}>
          {saving ? "…" : item ? "Enregistrer" : "Créer l'article"}
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------ Catégories ------------------------------ */

function CategoriesTab({
  categoryList,
  onChanged,
  onError,
}: {
  categoryList: CategoryInfo[];
  onChanged: () => void;
  onError: (e: string | null) => void;
}) {
  const { token } = useAuth();
  const [newLabel, setNewLabel] = useState("");
  const [editing, setEditing] = useState<CategoryInfo | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!token || !newLabel.trim()) return;
    setBusy(true);
    try {
      await createCategory(token, newLabel.trim());
      setNewLabel("");
      onError(null);
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Échec de la création.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRename() {
    if (!token || !editing || !editLabel.trim()) return;
    setBusy(true);
    try {
      await updateCategory(token, editing.id, { label: editLabel.trim() });
      setEditing(null);
      onError(null);
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Échec de la modification.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(cat: CategoryInfo) {
    if (!token) return;
    if (!confirm(`Supprimer la catégorie "${cat.label}" ?`)) return;
    try {
      await deleteCategory(token, cat.id);
      onError(null);
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Échec de la suppression.");
    }
  }

  async function move(cat: CategoryInfo, dir: -1 | 1) {
    if (!token) return;
    const sorted = [...categoryList].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.id === cat.id);
    const target = sorted[idx + dir];
    if (!target) return;
    await Promise.all([
      updateCategory(token, cat.id, { order: target.order }),
      updateCategory(token, target.id, { order: cat.order }),
    ]);
    onChanged();
  }

  const sorted = [...categoryList].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-6 p-5">
      <div className="mx-auto flex w-full max-w-[680px] gap-2.5">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          className={`${inputCls} flex-1`}
          placeholder="Nouvelle catégorie (ex: Boissons, Desserts…)"
        />
        <button onClick={handleCreate} disabled={busy || !newLabel.trim()} className={btnPrimary}>
          Créer
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {sorted.map((cat, idx) => {
          const hue = hueForName(cat.label);
          return (
            <div key={cat.id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-panel">
              <div
                className="relative flex aspect-square w-full items-center justify-center"
                style={{ background: `linear-gradient(135deg, oklch(0.32 0.05 ${hue}), oklch(0.2 0.03 ${hue}))` }}
              >
                <span className="px-2 text-center font-display text-2xl leading-tight tracking-wide text-fg/80">
                  {cat.label}
                </span>
                <div className="absolute right-2 top-2 flex flex-col overflow-hidden rounded-lg bg-black/30 backdrop-blur-sm">
                  <button
                    onClick={() => move(cat, -1)}
                    disabled={idx === 0}
                    aria-label="Monter"
                    className="flex h-9 w-9 items-center justify-center text-sm text-fg/80 transition-colors motion-safe:active:scale-90 hover:bg-black/20 disabled:opacity-20"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => move(cat, 1)}
                    disabled={idx === sorted.length - 1}
                    aria-label="Descendre"
                    className="flex h-9 w-9 items-center justify-center text-sm text-fg/80 transition-colors motion-safe:active:scale-90 hover:bg-black/20 disabled:opacity-20"
                  >
                    ▼
                  </button>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2.5 p-3.5">
                <div className="text-xs text-muted">
                  {cat.itemCount} article(s) · clé&nbsp;: {cat.key}
                </div>
                <div className="mt-auto flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(cat);
                      setEditLabel(cat.label);
                    }}
                    className="flex h-11 flex-1 items-center justify-center rounded-xl border border-border text-sm text-muted transition-colors motion-safe:active:scale-95 hover:border-green hover:text-fg"
                  >
                    Renommer
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    disabled={cat.itemCount > 0}
                    title={cat.itemCount > 0 ? "Déplacez d'abord les articles de cette catégorie" : undefined}
                    aria-label="Supprimer"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-base text-muted transition-colors motion-safe:active:scale-95 hover:border-red hover:text-red disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <Modal title={`Renommer — ${editing.label}`} onClose={() => setEditing(null)}>
          <Field label="Nouveau nom">
            <input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              className={inputCls}
              autoFocus
            />
          </Field>
          <div className="flex justify-end gap-2.5">
            <button onClick={() => setEditing(null)} className={btnGhost}>
              Annuler
            </button>
            <button onClick={handleRename} disabled={busy || !editLabel.trim()} className={btnPrimary}>
              Enregistrer
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------ Ingrédients ----------------------------- */

function IngredientsTab({
  ingredients,
  onChanged,
  onError,
}: {
  ingredients: Ingredient[];
  onChanged: () => void;
  onError: (e: string | null) => void;
}) {
  const { token } = useAuth();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function adjust(ing: Ingredient, delta: number) {
    if (!token) return;
    setBusyId(ing._id);
    try {
      await adjustIngredient(token, ing._id, delta, delta < 0 ? "waste" : "adjustment");
      onChanged();
    } catch {
      onError("Échec de l'ajustement.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(ing: Ingredient) {
    if (!token) return;
    if (!confirm(`Supprimer l'ingrédient "${ing.name}" ?`)) return;
    try {
      await deleteIngredient(token, ing._id);
      onError(null);
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Échec de la suppression.");
    }
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex justify-end">
        <button onClick={() => setCreating(true)} className={btnPrimary}>
          + Nouvel ingrédient
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {ingredients.map((ing) => {
          const low = ing.qty <= ing.lowThreshold;
          return (
            <div
              key={ing._id}
              className={`flex flex-col gap-3 rounded-2xl border p-4 transition-colors ${low ? "border-orange bg-orange-soft" : "border-border bg-panel"
                }`}
            >
              <div>
                <div className="font-display text-lg leading-tight">{ing.name}</div>
                {low ? (
                  <span className="mt-1 inline-block rounded-full bg-orange-soft px-2 py-0.5 text-[10px] font-semibold text-orange">
                    STOCK BAS
                  </span>
                ) : (
                  <div className="mt-1 text-[11px] text-muted">Seuil&nbsp;: {ing.lowThreshold} {ing.unit}</div>
                )}
              </div>

              <div className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2">
                <div className={`font-display text-4xl leading-none ${low ? "text-orange" : "text-green"}`}>
                  {ing.qty}
                </div>
                <div className="text-xs text-muted">{ing.unit}</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => adjust(ing, -1)}
                  disabled={busyId === ing._id || ing.qty === 0}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border text-lg transition-colors motion-safe:active:scale-95 hover:border-red disabled:opacity-30"
                >
                  −
                </button>
                <button
                  onClick={() => adjust(ing, 1)}
                  disabled={busyId === ing._id}
                  className="flex h-12 flex-1 items-center justify-center rounded-xl border border-green text-lg text-green transition-colors motion-safe:active:scale-95 disabled:opacity-30"
                >
                  +
                </button>
                <button
                  onClick={() => adjust(ing, 10)}
                  disabled={busyId === ing._id}
                  className="h-12 shrink-0 rounded-xl border border-border px-3 text-xs text-muted transition-colors motion-safe:active:scale-95 hover:border-green hover:text-fg disabled:opacity-30"
                >
                  +10
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(ing)}
                  className="flex h-11 flex-1 items-center justify-center rounded-xl border border-border text-sm text-muted transition-colors motion-safe:active:scale-95 hover:border-green hover:text-fg"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(ing)}
                  aria-label="Supprimer"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-base text-muted transition-colors motion-safe:active:scale-95 hover:border-red hover:text-red"
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {(creating || editing) && (
        <IngredientFormModal
          ingredient={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            onChanged();
          }}
          onError={onError}
        />
      )}
    </div>
  );
}

function IngredientFormModal({
  ingredient,
  onClose,
  onSaved,
  onError,
}: {
  ingredient: Ingredient | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (e: string | null) => void;
}) {
  const { token } = useAuth();
  const [name, setName] = useState(ingredient?.name || "");
  const [unit, setUnit] = useState(ingredient?.unit || "pcs");
  const [qty, setQty] = useState(ingredient?.qty ?? 0);
  const [lowThreshold, setLowThreshold] = useState(ingredient?.lowThreshold ?? 10);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!token || !name.trim()) return;
    setSaving(true);
    try {
      if (ingredient) {
        await updateIngredient(token, ingredient._id, { name: name.trim(), unit, lowThreshold });
      } else {
        await createIngredient(token, { name: name.trim(), unit, qty, lowThreshold });
      }
      onError(null);
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={ingredient ? `Modifier — ${ingredient.name}` : "Nouvel ingrédient"} onClose={onClose}>
      <Field label="Nom">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Tomates" autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Unité">
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
            <option value="pcs">pièces</option>
            <option value="portions">portions</option>
            <option value="g">grammes</option>
            <option value="kg">kilogrammes</option>
            <option value="L">litres</option>
          </select>
        </Field>
        <Field label="Seuil d'alerte">
          <input type="number" min={0} value={lowThreshold} onChange={(e) => setLowThreshold(Number(e.target.value))} className={inputCls} />
        </Field>
      </div>
      {!ingredient && (
        <Field label="Quantité initiale">
          <input type="number" min={0} value={qty} onChange={(e) => setQty(Number(e.target.value))} className={inputCls} />
        </Field>
      )}
      {ingredient && (
        <div className="rounded-xl bg-panel px-4 py-3 text-xs text-muted">
          La quantité se modifie depuis la liste (+/−) pour garder l&apos;historique des mouvements de stock.
        </div>
      )}
      <div className="flex justify-end gap-2.5">
        <button onClick={onClose} className={btnGhost}>
          Annuler
        </button>
        <button onClick={handleSave} disabled={saving || !name.trim()} className={btnPrimary}>
          {saving ? "…" : "Enregistrer"}
        </button>
      </div>
    </Modal>
  );
}

export default function AdminPage() {
  return (
    <RoleGate allow={["manager"]}>
      <MenuAdmin />
    </RoleGate>
  );
}
