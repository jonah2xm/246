"use client";

import { useMemo, useState } from "react";
import { Category, MenuItemDTO, Supplement } from "@/lib/types";
import { useCart } from "@/lib/cart-context";

const SUPPLEMENT_CATEGORIES = new Set(["classic", "signature"]);

export default function ItemDetailSheet({
  item,
  categoryKey,
  supplements,
  allCategories,
  onClose,
}: {
  item: MenuItemDTO;
  categoryKey: string;
  supplements: Supplement[];
  allCategories: Category[];
  onClose: () => void;
}) {
  if (item.comboConfig) {
    return <ComboDetailSheet item={item} comboConfig={item.comboConfig} allCategories={allCategories} onClose={onClose} />;
  }
  return <StandardDetailSheet item={item} categoryKey={categoryKey} supplements={supplements} onClose={onClose} />;
}

function StandardDetailSheet({
  item,
  categoryKey,
  supplements,
  onClose,
}: {
  item: MenuItemDTO;
  categoryKey: string;
  supplements: Supplement[];
  onClose: () => void;
}) {
  const { addToCart } = useCart();
  const [sizeIdx, setSizeIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedSupp, setSelectedSupp] = useState<Record<string, boolean>>({});

  const showSupplements = SUPPLEMENT_CATEGORIES.has(categoryKey);

  const size = item.sizes[sizeIdx];
  const suppTotal = useMemo(
    () => supplements.filter((s) => selectedSupp[s.key]).reduce((sum, s) => sum + s.price, 0),
    [supplements, selectedSupp]
  );
  const unitPrice = size.price + suppTotal;
  const totalPrice = unitPrice * qty;

  function toggleSupp(key: string) {
    setSelectedSupp((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleAddToCart() {
    const suppLabels = supplements.filter((s) => selectedSupp[s.key]).map((s) => s.label);
    addToCart({
      name: item.name,
      sizeLabel: size.label,
      unitPrice,
      qty,
      supplements: suppLabels,
      comboSelections: [],
    });
    onClose();
  }

  return (
    <SheetShell title={item.name} desc={item.desc} onClose={onClose}>
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Taille</div>
        <div className="flex gap-2.5">
          {item.sizes.map((sz, idx) => {
            const isActive = idx === sizeIdx;
            return (
              <button
                key={sz.label}
                onClick={() => setSizeIdx(idx)}
                className={`flex-1 min-h-12 rounded-xl border p-3 text-sm font-semibold transition-all select-none touch-manipulation motion-safe:active:scale-95 ${
                  isActive
                    ? "border-green bg-green text-[#08130a] shadow-md shadow-green/20"
                    : "border-border bg-panel text-fg hover:border-green/50"
                }`}
              >
                {sz.label} — {sz.price} DA
              </button>
            );
          })}
        </div>
      </div>

      {showSupplements && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Suppléments</div>
          <div className="flex flex-col gap-2">
            {supplements.map((s) => {
              const checked = !!selectedSupp[s.key];
              return (
                <button
                  key={s.key}
                  onClick={() => toggleSupp(s.key)}
                  className={`flex min-h-12 items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-all select-none touch-manipulation motion-safe:active:scale-[0.98] ${
                    checked
                      ? "border-green bg-green-soft font-semibold text-fg"
                      : "border-border bg-panel text-muted hover:border-green/50"
                  }`}
                >
                  <span>{s.label}</span>
                  <span className="font-semibold text-green">+{s.price} DA</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between py-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">Quantité</div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-panel text-xl font-bold transition-colors select-none motion-safe:active:scale-90"
          >
            −
          </button>
          <div className="min-w-[28px] text-center font-display text-xl">{qty}</div>
          <button
            onClick={() => setQty((q) => q + 1)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-green bg-green-soft text-xl font-bold text-green transition-colors select-none motion-safe:active:scale-90"
          >
            +
          </button>
        </div>
      </div>

      <button
        onClick={handleAddToCart}
        className="mt-2 flex h-14 w-full items-center justify-between rounded-2xl bg-green px-5 py-4 font-display text-lg tracking-wide text-[#08130a] shadow-lg shadow-green/20 transition-all select-none motion-safe:active:scale-[0.98] hover:bg-green-hover"
      >
        <span>AJOUTER AU PANIER</span>
        <span className="font-bold">{totalPrice} DA</span>
      </button>
    </SheetShell>
  );
}

function ComboDetailSheet({
  item,
  comboConfig,
  allCategories,
  onClose,
}: {
  item: MenuItemDTO;
  comboConfig: { picks: number; eligibleCategoryKeys: string[] };
  allCategories: Category[];
  onClose: () => void;
}) {
  const { addToCart } = useCart();
  const [selected, setSelected] = useState<{ name: string; sizeLabel: string }[]>([]);

  const eligibleItems = useMemo(
    () =>
      allCategories
        .filter((c) => comboConfig.eligibleCategoryKeys.includes(c.key))
        .flatMap((c) => c.items)
        .filter((it) => it.available),
    [allCategories, comboConfig]
  );

  const size = item.sizes[0];
  const remaining = comboConfig.picks - selected.length;

  function pick(pizza: MenuItemDTO) {
    if (remaining <= 0) return;
    setSelected((prev) => [...prev, { name: pizza.name, sizeLabel: pizza.sizes[0].label }]);
  }

  function removeAt(idx: number) {
    setSelected((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleAddToCart() {
    addToCart({
      name: item.name,
      sizeLabel: size.label,
      unitPrice: size.price,
      qty: 1,
      supplements: [],
      comboSelections: selected,
    });
    onClose();
  }

  return (
    <SheetShell title={item.name} desc={item.desc} onClose={onClose}>
      <div className="flex items-center justify-between rounded-xl border border-border bg-panel px-4 py-3">
        <span className="text-sm font-semibold">{size.label}</span>
        <span className="font-display text-lg text-green">{size.price} DA</span>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted">
          <span>Choisissez {comboConfig.picks} pizzas</span>
          <span className={remaining === 0 ? "text-green font-bold" : ""}>{selected.length}/{comboConfig.picks}</span>
        </div>

        {selected.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selected.map((s, idx) => (
              <button
                key={`${s.name}-${idx}`}
                onClick={() => removeAt(idx)}
                className="flex items-center gap-1.5 rounded-full border border-green bg-green-soft px-3.5 py-1.5 text-xs font-semibold text-green transition-all select-none motion-safe:active:scale-95"
              >
                <span>{s.name}</span>
                <span className="text-sm">✕</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 max-h-[180px] overflow-y-auto pr-1">
          {eligibleItems.map((pizza) => (
            <button
              key={pizza.id}
              onClick={() => pick(pizza)}
              disabled={remaining <= 0}
              className="min-h-11 rounded-xl border border-border bg-panel p-3 text-left text-xs font-semibold transition-all select-none motion-safe:active:scale-[0.97] hover:border-green disabled:opacity-40"
            >
              {pizza.name}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleAddToCart}
        disabled={selected.length !== comboConfig.picks}
        className="mt-2 flex h-14 w-full items-center justify-between rounded-2xl bg-green px-5 py-4 font-display text-lg tracking-wide text-[#08130a] shadow-lg shadow-green/20 transition-all select-none motion-safe:active:scale-[0.98] hover:bg-green-hover disabled:opacity-50"
      >
        <span>AJOUTER AU PANIER</span>
        <span className="font-bold">{size.price} DA</span>
      </button>
    </SheetShell>
  );
}

function SheetShell({
  title,
  desc,
  onClose,
  children,
}: {
  title: string;
  desc: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/70 animate-fade-in" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-[520px] flex-col gap-4 overflow-y-auto rounded-t-3xl border border-border border-b-0 bg-panel-2 px-5 pb-7 pt-3 shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Native Touch Sheet Handle */}
        <div className="w-12 h-1.5 rounded-full bg-border/80 mx-auto my-1 shrink-0" />

        <div className="flex items-start justify-between">
          <div>
            <div className="font-display text-[25px] tracking-wide">{title}</div>
            <div className="mt-1 text-[13px] text-muted">{desc}</div>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl leading-none text-muted transition-colors hover:bg-panel hover:text-fg"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
