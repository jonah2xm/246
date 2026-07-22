"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RoleGate from "@/components/RoleGate";
import TopBar from "@/components/TopBar";
import PhotoTile from "@/components/PhotoTile";
import { btnGhost } from "@/components/Modal";
import { LineConfigurator, Supplement, SUPPLEMENT_CATEGORIES } from "@/components/OrderBuilder";
import { useAuth } from "@/lib/auth-context";
import { getMenuAdmin, getTables, getTodayOrders, createCounterOrder, updateOrderItems } from "@/lib/api";
import { CategoryAdmin, MenuItemAdmin, OrderLine, StaffOrder, TableInfo, TableStatus } from "@/lib/types";

type Step = "table" | "order";

const STATUS_DOT: Record<TableStatus, string> = {
  free: "bg-muted",
  occupied: "bg-green",
};

const STATUS_LABEL: Record<TableStatus, string> = {
  free: "Libre",
  occupied: "Occupée",
};

function StepHeader({
  title,
  subtitle,
  onBack,
  backLabel,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  backLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
      <div>
        <button onClick={onBack} className={`${btnGhost} mb-2 flex items-center gap-1.5`}>
          ← {backLabel}
        </button>
        <div className="font-display text-3xl leading-none">{title}</div>
        <div className="mt-1 text-sm text-muted">{subtitle}</div>
      </div>
    </div>
  );
}

function NewOrderFlow() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<CategoryAdmin[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const presetTableSlug = searchParams.get("tableSlug");
  const presetTableLabel = searchParams.get("tableLabel");
  const presetCounter = searchParams.get("counter");
  const editOrderId = searchParams.get("editOrderId");
  const preselected = !!presetTableSlug || !!presetCounter || !!editOrderId;

  const [step, setStep] = useState<Step>(preselected ? "order" : "table");
  const [tableSlug, setTableSlug] = useState<string | null>(presetTableSlug);
  const [tableLabel, setTableLabel] = useState<string>(presetTableLabel || "Comptoir / à emporter");
  const [activeCat, setActiveCat] = useState<string>("");
  const [configuring, setConfiguring] = useState<{ item: MenuItemAdmin; categoryKey: string } | null>(null);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "tpe">("cash");
  const [submitting, setSubmitting] = useState(false);
  const [editOrder, setEditOrder] = useState<StaffOrder | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [menu, tbls] = await Promise.all([getMenuAdmin(token), getTables(token)]);
        const withItems = menu.categories.filter((c) => c.items.length > 0);
        setCategories(withItems);
        setSupplements(menu.supplements || []);
        setTables(tbls);
        setActiveCat(withItems[0]?.key ?? "");

        if (editOrderId) {
          const todaysOrders = await getTodayOrders(token);
          const found = todaysOrders.find((o) => o.id === editOrderId);
          if (found) {
            setEditOrder(found);
            setLines(
              found.items.map((it) => ({
                name: it.name,
                sizeLabel: it.sizeLabel,
                unitPrice: it.unitPrice,
                qty: it.qty,
                supplements: it.supplements,
                comboSelections: it.comboSelections,
              }))
            );
          } else {
            setError("Commande introuvable.");
          }
        }
      } catch {
        setError("Impossible de charger le menu.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const total = useMemo(() => lines.reduce((s, l) => s + l.unitPrice * l.qty, 0), [lines]);
  const itemCount = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);
  const cat = categories.find((c) => c.key === activeCat);

  function pickTable(slug: string | null, label: string) {
    setTableSlug(slug);
    setTableLabel(label);
    setStep("order");
  }

  // Same line = same item, size and supplements, no combo — bump its qty
  // instead of piling up duplicate rows when someone taps a tile repeatedly.
  function addLine(line: OrderLine) {
    setLines((prev) => {
      const key = (l: OrderLine) => `${l.name}::${l.sizeLabel}::${[...l.supplements].sort().join(",")}`;
      const canMerge = line.comboSelections.length === 0;
      const matchIdx = canMerge ? prev.findIndex((l) => l.comboSelections.length === 0 && key(l) === key(line)) : -1;
      if (matchIdx >= 0) {
        return prev.map((l, i) => (i === matchIdx ? { ...l, qty: l.qty + line.qty } : l));
      }
      return [...prev, line];
    });
    setConfiguring(null);
  }

  // Items with one size, no supplement options and no combo need no picker
  // at all — tapping the tile adds them straight to the cart.
  function handleTileTap(item: MenuItemAdmin, categoryKey: string) {
    const needsChoice = item.sizes.length > 1 || SUPPLEMENT_CATEGORIES.has(categoryKey) || !!item.comboConfig;
    if (needsChoice) {
      setConfiguring({ item, categoryKey });
      return;
    }
    addLine({
      name: item.name,
      sizeLabel: item.sizes[0].label,
      unitPrice: item.sizes[0].price,
      qty: 1,
      supplements: [],
      comboSelections: [],
    });
  }

  function updateQty(idx: number, delta: number) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0));
  }

  async function handleSubmit() {
    if (!token || lines.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      if (editOrder) {
        await updateOrderItems(token, editOrder.id, lines);
      } else {
        await createCounterOrder({ items: lines, paymentMethod, tableSlug });
      }
      router.push("/cashier");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <div className="flex min-h-[60vh] items-center justify-center text-muted">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      {error && <div className="mx-5 mt-3 rounded-xl bg-red-soft px-4 py-2.5 text-sm text-red">{error}</div>}

      {/* -------------------------------- STEP 1 -------------------------------- */}
      {step === "table" && (
        <>
          <StepHeader
            title="Nouvelle commande"
            subtitle="Choisissez une table, ou passez au comptoir"
            onBack={() => router.push("/cashier")}
            backLabel="Annuler"
          />
          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <button
              onClick={() => pickTable(null, "Comptoir / à emporter")}
              className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-green bg-green-soft p-4 text-center transition-colors motion-safe:active:scale-[0.97]"
            >
              <div className="font-display text-2xl text-green">COMPTOIR</div>
              <div className="text-xs text-muted">À emporter, sans table</div>
            </button>
            {tables.map((t) => {
              const free = t.status === "free";
              return (
                <button
                  key={t.id}
                  onClick={() => free && pickTable(t.qrSlug, t.label)}
                  disabled={!free}
                  className={`flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 text-center transition-colors motion-safe:active:scale-[0.97] ${
                    free ? "border-border bg-panel hover:border-green" : "border-border bg-panel-2 opacity-50"
                  }`}
                >
                  <div className="font-display text-3xl leading-none">{t.label}</div>
                  <div className="text-xs text-muted">{t.capacity} places</div>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
                    <span className={`h-2 w-2 rounded-full ${STATUS_DOT[t.status]}`} />
                    {STATUS_LABEL[t.status]}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ---------------------------- STEP 2: menu + cart sidebar ---------------------------- */}
      {step === "order" && (
        <>
          <StepHeader
            title={editOrder ? `Commande #${editOrder.orderNumber}` : tableLabel}
            subtitle={editOrder ? "Modifiez les articles de la commande" : "Choisissez les articles"}
            onBack={editOrder ? () => router.push("/cashier") : () => setStep("table")}
            backLabel={editOrder ? "Caisse" : "Table"}
          />

          <div className="flex flex-1 flex-col gap-5 px-5 pb-5 lg:flex-row lg:items-start">
            {/* Menu — categories + item tiles */}
            <div className="min-w-0 flex-1">
              <div className="flex gap-2.5 overflow-x-auto pt-4 pb-1 select-none touch-pan-x">
                {categories.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setActiveCat(c.key)}
                    className={`flex-none min-h-12 rounded-full px-5 py-3 text-sm font-semibold transition-all motion-safe:active:scale-95 ${
                      activeCat === c.key
                        ? "bg-green text-[#08130a] shadow-md shadow-green/20"
                        : "border border-border bg-panel text-muted hover:text-fg hover:border-green/50"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-3 xl:grid-cols-4">
                {cat?.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTileTap(item, cat.key)}
                    disabled={!item.available}
                    className="flex flex-col overflow-hidden rounded-2xl border border-border bg-panel text-left transition-colors motion-safe:active:scale-[0.97] hover:border-green disabled:opacity-40"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-panel-2">
                      <PhotoTile src={item.photo} name={item.name} />
                      {!item.available && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/65">
                          <span className="rounded-full bg-red px-3 py-1.5 text-xs font-bold text-white">ÉPUISÉ</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 p-3">
                      <div className="font-display text-base leading-tight">{item.name}</div>
                      <div className="text-sm font-semibold text-green">
                        {item.sizes.map((s) => `${s.price} DA`).join(" / ")}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cart sidebar — persistent, stays in view while browsing the menu */}
            <aside className="flex w-full shrink-0 flex-col rounded-2xl border border-border bg-panel lg:sticky lg:top-[92px] lg:w-[360px] lg:max-h-[calc(100vh-112px)]">
              <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
                <div className="font-display text-xl">Commande</div>
                <span className="text-xs text-muted">{itemCount} article(s)</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {lines.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
                    Touchez un article pour l&apos;ajouter.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {lines.map((l, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 rounded-xl bg-panel-2 px-3 py-2.5">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {l.name} <span className="text-muted">({l.sizeLabel})</span>
                          </div>
                          {(l.supplements.length > 0 || l.comboSelections.length > 0) && (
                            <div className="truncate text-[11px] text-muted">
                              {[...l.comboSelections.map((s) => s.name), ...l.supplements].join(", ")}
                            </div>
                          )}
                          <div className="mt-1 text-xs text-green">{l.unitPrice * l.qty} DA</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            onClick={() => updateQty(idx, -1)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors motion-safe:active:scale-90"
                          >
                            −
                          </button>
                          <span className="min-w-[16px] text-center text-sm">{l.qty}</span>
                          <button
                            onClick={() => updateQty(idx, 1)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-green text-green transition-colors motion-safe:active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-border p-4">
                {editOrder ? (
                  <div className="rounded-xl bg-panel-2 px-3 py-2.5 text-xs text-muted">
                    Paiement : {editOrder.payment.method === "cash" ? "Espèces" : "TPE"} (non modifiable)
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPaymentMethod("cash")}
                      className={`rounded-xl border-2 py-3 text-sm font-medium transition-colors motion-safe:active:scale-95 ${
                        paymentMethod === "cash" ? "border-green bg-green-soft text-green" : "border-border text-muted"
                      }`}
                    >
                      Espèces
                    </button>
                    <button
                      onClick={() => setPaymentMethod("tpe")}
                      className={`rounded-xl border-2 py-3 text-sm font-medium transition-colors motion-safe:active:scale-95 ${
                        paymentMethod === "tpe" ? "border-green bg-green-soft text-green" : "border-border text-muted"
                      }`}
                    >
                      TPE
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="font-display text-lg">Total</span>
                  <span className="font-display text-2xl text-green">{total} DA</span>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || lines.length === 0}
                  className="h-14 rounded-xl bg-green font-display text-xl tracking-wide text-[#08130a] transition-colors motion-safe:active:scale-[0.97] hover:bg-green-hover disabled:opacity-50"
                >
                  {submitting ? "…" : editOrder ? "Enregistrer les modifications" : "Envoyer en cuisine"}
                </button>
              </div>
            </aside>
          </div>

          {configuring && (
            <div
              className="fixed inset-0 z-30 flex items-end justify-center bg-black/70 p-4 sm:items-center"
              onClick={() => setConfiguring(null)}
            >
              <div className="w-full max-w-[480px]" onClick={(e) => e.stopPropagation()}>
                <LineConfigurator
                  item={configuring.item}
                  categoryKey={configuring.categoryKey}
                  supplements={supplements}
                  categories={categories}
                  onAdd={addLine}
                  onCancel={() => setConfiguring(null)}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <RoleGate allow={["cashier", "manager"]}>
      <Suspense fallback={null}>
        <NewOrderFlow />
      </Suspense>
    </RoleGate>
  );
}
