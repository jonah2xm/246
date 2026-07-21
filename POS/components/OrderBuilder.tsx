"use client";

import { useMemo, useState } from "react";
import { CategoryAdmin, MenuItemAdmin, OrderLine, ComboSelection } from "@/lib/types";

// Categories whose items can take supplements (mirrors the customer app).
export const SUPPLEMENT_CATEGORIES = new Set(["classic", "signature"]);

export interface Supplement {
  key: string;
  label: string;
  price: number;
}

// Size / supplements / combo picker for one line before adding it.
export function LineConfigurator({
  item,
  categoryKey,
  supplements,
  categories,
  onAdd,
  onCancel,
}: {
  item: MenuItemAdmin;
  categoryKey: string;
  supplements: Supplement[];
  categories: CategoryAdmin[];
  onAdd: (line: OrderLine) => void;
  onCancel: () => void;
}) {
  const [sizeIdx, setSizeIdx] = useState(0);
  const [selectedSupp, setSelectedSupp] = useState<Record<string, boolean>>({});
  const [comboPicks, setComboPicks] = useState<ComboSelection[]>([]);

  const showSupplements = !item.comboConfig && SUPPLEMENT_CATEGORIES.has(categoryKey);
  const size = item.sizes[sizeIdx];
  const suppTotal = supplements.filter((s) => selectedSupp[s.key]).reduce((sum, s) => sum + s.price, 0);
  const unitPrice = size.price + (showSupplements ? suppTotal : 0);

  const eligibleComboItems = useMemo(() => {
    if (!item.comboConfig) return [];
    return categories
      .filter((c) => item.comboConfig!.eligibleCategoryKeys.includes(c.key))
      .flatMap((c) => c.items)
      .filter((it) => it.available);
  }, [item, categories]);

  const comboComplete = !item.comboConfig || comboPicks.length === item.comboConfig.picks;

  function handleAdd() {
    onAdd({
      name: item.name,
      sizeLabel: size.label,
      unitPrice,
      qty: 1,
      supplements: showSupplements ? supplements.filter((s) => selectedSupp[s.key]).map((s) => s.label) : [],
      comboSelections: comboPicks,
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-green bg-panel p-3.5">
      <div className="flex items-center justify-between">
        <div className="font-display text-lg">{item.name}</div>
        <button onClick={onCancel} className="text-lg leading-none text-muted hover:text-fg">✕</button>
      </div>

      {item.sizes.length > 1 && (
        <div className="flex gap-2">
          {item.sizes.map((sz, idx) => (
            <button
              key={sz.label}
              onClick={() => setSizeIdx(idx)}
              className={`flex-1 rounded-lg border px-2 py-2 text-xs font-bold transition-colors ${
                idx === sizeIdx ? "border-green bg-green text-[#08130a]" : "border-border text-fg"
              }`}
            >
              {sz.label} — {sz.price} DA
            </button>
          ))}
        </div>
      )}

      {showSupplements && supplements.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {supplements.map((s) => (
            <button
              key={s.key}
              onClick={() => setSelectedSupp((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
              className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
                selectedSupp[s.key] ? "border-green bg-green-soft text-green" : "border-border text-muted"
              }`}
            >
              {s.label} +{s.price} DA
            </button>
          ))}
        </div>
      )}

      {item.comboConfig && (
        <div>
          <div className="mb-1.5 flex justify-between text-[11px] uppercase tracking-wide text-muted">
            <span>Choisissez {item.comboConfig.picks} pizzas</span>
            <span className={comboComplete ? "text-green" : ""}>
              {comboPicks.length}/{item.comboConfig.picks}
            </span>
          </div>
          {comboPicks.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {comboPicks.map((p, idx) => (
                <button
                  key={`${p.name}-${idx}`}
                  onClick={() => setComboPicks((prev) => prev.filter((_, i) => i !== idx))}
                  className="rounded-full border border-green bg-green-soft px-2.5 py-0.5 text-[11px] text-green"
                >
                  {p.name} ✕
                </button>
              ))}
            </div>
          )}
          <div className="grid max-h-[120px] grid-cols-3 gap-1.5 overflow-y-auto">
            {eligibleComboItems.map((pz) => (
              <button
                key={pz.id}
                onClick={() =>
                  comboPicks.length < item.comboConfig!.picks &&
                  setComboPicks((prev) => [...prev, { name: pz.name, sizeLabel: pz.sizes[0].label }])
                }
                disabled={comboPicks.length >= item.comboConfig!.picks}
                className="rounded-lg border border-border px-2 py-1.5 text-left text-[11px] transition-colors hover:border-green disabled:opacity-40"
              >
                {pz.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleAdd}
        disabled={!comboComplete}
        className="h-11 rounded-xl bg-green text-sm font-semibold text-[#08130a] transition-colors motion-safe:active:scale-95 hover:bg-green-hover disabled:opacity-50"
      >
        Ajouter — {unitPrice} DA
      </button>
    </div>
  );
}
