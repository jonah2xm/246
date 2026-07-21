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
        <div className="mb-2 text-xs uppercase tracking-wide text-muted">Taille</div>
        <div className="flex gap-2.5">
          {item.sizes.map((sz, idx) => {
            const isActive = idx === sizeIdx;
            return (
              <button
                key={sz.label}
                onClick={() => setSizeIdx(idx)}
                className={`flex-1 rounded-xl border p-3 text-sm font-bold ${
                  isActive ? "border-green bg-green text-[#08130a]" : "border-border bg-transparent text-fg"
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
          <div className="mb-2 text-xs uppercase tracking-wide text-muted">Suppléments</div>
          <div className="flex flex-col gap-2">
            {supplements.map((s) => {
              const checked = !!selectedSupp[s.key];
              return (
                <button
                  key={s.key}
                  onClick={() => toggleSupp(s.key)}
                  className={`flex items-center justify-between rounded-[10px] border px-3.5 py-2.5 text-[13px] ${
                    checked ? "border-green bg-green-soft" : "border-border bg-transparent"
                  }`}
                >
                  <span>{s.label}</span>
                  <span className="text-green">+{s.price} DA</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted">Quantité</div>
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="h-[34px] w-[34px] rounded-lg border border-border text-lg"
          >
            −
          </button>
          <div className="min-w-[20px] text-center text-base">{qty}</div>
          <button onClick={() => setQty((q) => q + 1)} className="h-[34px] w-[34px] rounded-lg border border-border text-lg">
            +
          </button>
        </div>
      </div>

      <button
        onClick={handleAddToCart}
        className="mt-1 flex justify-between rounded-2xl bg-green px-5 py-4 font-display text-lg tracking-wide text-[#08130a]"
      >
        <span>AJOUTER AU PANIER</span>
        <span>{totalPrice} DA</span>
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
      <div className="flex items-center justify-between rounded-xl bg-panel px-4 py-3">
        <span className="text-sm">{size.label}</span>
        <span className="font-display text-lg text-green">{size.price} DA</span>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-muted">
          <span>Choisissez {comboConfig.picks} pizzas</span>
          <span className={remaining === 0 ? "text-green" : ""}>{selected.length}/{comboConfig.picks}</span>
        </div>

        {selected.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {selected.map((s, idx) => (
              <button
                key={`${s.name}-${idx}`}
                onClick={() => removeAt(idx)}
                className="rounded-full border border-green bg-green-soft px-3 py-1 text-[12px] text-green"
              >
                {s.name} ✕
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {eligibleItems.map((pizza) => (
            <button
              key={pizza.id}
              onClick={() => pick(pizza)}
              disabled={remaining <= 0}
              className="rounded-xl border border-border bg-transparent p-2.5 text-left text-[13px] disabled:opacity-40"
            >
              {pizza.name}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleAddToCart}
        disabled={selected.length !== comboConfig.picks}
        className="mt-1 flex justify-between rounded-2xl bg-green px-5 py-4 font-display text-lg tracking-wide text-[#08130a] disabled:opacity-50"
      >
        <span>AJOUTER AU PANIER</span>
        <span>{size.price} DA</span>
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
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/70">
      <div className="flex max-h-[88vh] w-full max-w-[520px] flex-col gap-4 overflow-y-auto rounded-t-[20px] bg-panel-2 px-5 pb-7 pt-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-display text-[25px]">{title}</div>
            <div className="mt-1 text-[13px] text-muted">{desc}</div>
          </div>
          <button onClick={onClose} className="text-[22px] leading-none text-muted">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
