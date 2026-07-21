"use client";

import { useEffect, useMemo, useState } from "react";
import Modal, { inputCls, btnPrimary, btnGhost } from "@/components/Modal";
import { useAuth } from "@/lib/auth-context";
import { getMenuAdmin, getTables } from "@/lib/api";
import { CategoryAdmin, MenuItemAdmin, OrderLine, TableInfo, ComboSelection } from "@/lib/types";

// Categories whose items can take supplements (mirrors the customer app).
const SUPPLEMENT_CATEGORIES = new Set(["classic", "signature"]);

interface Supplement {
  key: string;
  label: string;
  price: number;
}

export default function OrderBuilder({
  title,
  initialLines = [],
  showCheckoutOptions,
  submitLabel,
  onSubmit,
  onClose,
}: {
  title: string;
  initialLines?: OrderLine[];
  // true for new counter orders (table + payment method); false when editing lines only
  showCheckoutOptions: boolean;
  submitLabel: string;
  onSubmit: (lines: OrderLine[], opts: { paymentMethod: "cash" | "tpe"; tableSlug: string | null }) => Promise<void>;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const [categories, setCategories] = useState<CategoryAdmin[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [activeCat, setActiveCat] = useState<string>("");
  const [lines, setLines] = useState<OrderLine[]>(initialLines.map((l) => ({ ...l, supplements: [...l.supplements], comboSelections: [...l.comboSelections] })));
  const [configuring, setConfiguring] = useState<{ item: MenuItemAdmin; categoryKey: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "tpe">("cash");
  const [tableSlug, setTableSlug] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([getMenuAdmin(token), showCheckoutOptions ? getTables(token) : Promise.resolve([])])
      .then(([menu, tbls]) => {
        setCategories(menu.categories.filter((c) => c.items.length > 0));
        setSupplements(menu.supplements || []);
        setTables(tbls as TableInfo[]);
        setActiveCat((menu.categories.find((c) => c.items.length > 0) || menu.categories[0])?.key ?? "");
      })
      .catch(() => setError("Impossible de charger le menu."));
  }, [token, showCheckoutOptions]);

  const total = useMemo(() => lines.reduce((s, l) => s + l.unitPrice * l.qty, 0), [lines]);
  const cat = categories.find((c) => c.key === activeCat);

  function addLine(line: OrderLine) {
    setLines((prev) => [...prev, line]);
    setConfiguring(null);
  }

  function updateQty(idx: number, delta: number) {
    setLines((prev) =>
      prev
        .map((l, i) => (i === idx ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0)
    );
  }

  async function handleSubmit() {
    if (lines.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(lines, { paymentMethod, tableSlug: tableSlug || null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  }

  return (
    <Modal title={title} onClose={onClose} wide>
      {error && <div className="rounded-xl bg-red-soft px-4 py-2.5 text-sm text-red">{error}</div>}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveCat(c.key)}
            className={`flex-none rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              activeCat === c.key ? "bg-green text-[#08130a]" : "bg-panel text-muted hover:text-fg"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid max-h-[200px] grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
        {cat?.items.map((item) => (
          <button
            key={item.id}
            onClick={() => setConfiguring({ item, categoryKey: cat.key })}
            disabled={!item.available}
            className="rounded-xl border border-border bg-panel p-2.5 text-left text-[13px] transition-colors hover:border-green disabled:opacity-40"
          >
            <div className="font-medium">{item.name}</div>
            <div className="text-[11px] text-muted">
              {item.available ? item.sizes.map((s) => `${s.price} DA`).join(" / ") : "Épuisé"}
            </div>
          </button>
        ))}
      </div>

      {configuring && (
        <LineConfigurator
          item={configuring.item}
          categoryKey={configuring.categoryKey}
          supplements={supplements}
          categories={categories}
          onAdd={addLine}
          onCancel={() => setConfiguring(null)}
        />
      )}

      <div className="border-t border-border pt-3">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Commande ({lines.length} ligne(s))</div>
        {lines.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-4 text-center text-sm text-muted">
            Cliquez sur un article pour l&apos;ajouter.
          </div>
        ) : (
          <div className="flex max-h-[160px] flex-col gap-1.5 overflow-y-auto">
            {lines.map((l, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 rounded-xl bg-panel px-3 py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-medium">
                    {l.name} <span className="text-muted">({l.sizeLabel})</span>
                  </span>
                  {(l.supplements.length > 0 || l.comboSelections.length > 0) && (
                    <div className="truncate text-[11px] text-muted">
                      {[...l.comboSelections.map((s) => s.name), ...l.supplements].join(", ")}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => updateQty(idx, -1)} className="h-6 w-6 rounded-md border border-border text-xs">−</button>
                  <span className="min-w-[16px] text-center">{l.qty}</span>
                  <button onClick={() => updateQty(idx, 1)} className="h-6 w-6 rounded-md border border-border text-xs">+</button>
                  <span className="min-w-[70px] text-right text-green">{l.unitPrice * l.qty} DA</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCheckoutOptions && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Table (facultatif)</div>
            <select value={tableSlug} onChange={(e) => setTableSlug(e.target.value)} className={`${inputCls} w-full`}>
              <option value="">Comptoir / à emporter</option>
              {tables.map((t) => (
                <option key={t.id} value={t.qrSlug}>
                  Table {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Paiement</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentMethod("cash")}
                className={`rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                  paymentMethod === "cash" ? "border-green bg-green-soft text-green" : "border-border text-muted"
                }`}
              >
                Espèces
              </button>
              <button
                onClick={() => setPaymentMethod("tpe")}
                className={`rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                  paymentMethod === "tpe" ? "border-green bg-green-soft text-green" : "border-border text-muted"
                }`}
              >
                TPE
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="font-display text-xl">
          Total <span className="text-green">{total} DA</span>
        </div>
        <div className="flex gap-2.5">
          <button onClick={onClose} className={btnGhost}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={submitting || lines.length === 0} className={btnPrimary}>
            {submitting ? "…" : submitLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Size / supplements / combo picker for one line before adding it.
function LineConfigurator({
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
  const [qty, setQty] = useState(1);
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
      qty: item.comboConfig ? 1 : qty,
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

      <div className="flex items-center justify-between">
        {!item.comboConfig ? (
          <div className="flex items-center gap-2">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-7 w-7 rounded-md border border-border text-sm">−</button>
            <span className="min-w-[18px] text-center text-sm">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} className="h-7 w-7 rounded-md border border-border text-sm">+</button>
          </div>
        ) : (
          <span />
        )}
        <button
          onClick={handleAdd}
          disabled={!comboComplete}
          className="rounded-xl bg-green px-4 py-2 text-sm font-semibold text-[#08130a] transition-colors hover:bg-green-hover disabled:opacity-50"
        >
          Ajouter — {unitPrice * (item.comboConfig ? 1 : qty)} DA
        </button>
      </div>
    </div>
  );
}
