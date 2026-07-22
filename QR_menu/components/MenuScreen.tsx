"use client";

import { Category, MenuItemDTO } from "@/lib/types";
import { useCart } from "@/lib/cart-context";
import CategoryPills from "./CategoryPills";
import ItemCard from "./ItemCard";

export default function MenuScreen({
  categories,
  activeCategory,
  onSelectCategory,
  onOpenItem,
  onGoToCart,
  tableLabel,
}: {
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (key: string) => void;
  onOpenItem: (catKey: string, item: MenuItemDTO) => void;
  onGoToCart: () => void;
  tableLabel?: string | null;
}) {
  const { cartCount, cartTotal } = useCart();
  const activeCat = categories.find((c) => c.key === activeCategory) ?? categories[0];

  return (
    <div className="min-h-screen pb-24">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-[15] flex items-center justify-between border-b border-border bg-bg/95 px-5 py-3.5 backdrop-blur-md select-none">
        <div className="flex items-center gap-2.5">
          <div className="font-display text-[22px] tracking-wide">
            24<span className="text-green">6</span>
          </div>
          {tableLabel && (
            <span className="rounded-full bg-green-soft px-3 py-1 text-xs font-semibold text-green">
              Table {tableLabel}
            </span>
          )}
        </div>
        <button
          onClick={onGoToCart}
          className="relative flex min-h-11 items-center gap-2 rounded-full border border-border bg-panel px-5 py-2.5 text-sm font-medium transition-colors motion-safe:active:scale-95 hover:border-green hover:text-fg"
        >
          Panier
          {cartCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green px-[5px] text-[11px] font-bold text-[#08130a]">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Sticky Category Pills Bar */}
      <div className="sticky top-[57px] z-10 bg-bg/95 backdrop-blur-md border-b border-border/40 pb-2">
        <CategoryPills categories={categories} active={activeCat.key} onSelect={onSelectCategory} />
      </div>

      {/* Category Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-1">
        <div className="flex items-center gap-2.5">
          <span className="h-5 w-1.5 rounded-full bg-green" />
          <h2 className="font-display text-2xl tracking-wide text-fg">{activeCat.label}</h2>
        </div>
        <span className="rounded-full border border-border bg-panel-2 px-3 py-0.5 text-xs font-semibold text-muted">
          {activeCat.items.length} article(s)
        </span>
      </div>

      {/* Dishes List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-4 pb-5 pt-4">
        {activeCat.items.map((it) => (
          <ItemCard key={it.id} item={it} onOpen={() => onOpenItem(activeCat.key, it)} />
        ))}
      </div>

      {/* Floating Bottom Cart Bar for Touchscreen Phones */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-20 animate-fade-in-up">
          <button
            onClick={onGoToCart}
            className="flex min-h-14 w-full items-center justify-between rounded-2xl bg-green px-5 py-3.5 font-display text-lg tracking-wide text-[#08130a] shadow-xl shadow-green/25 transition-all motion-safe:active:scale-[0.98] hover:bg-green-hover"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 min-w-[28px] items-center justify-center rounded-full bg-[#08130a] px-2 text-xs font-bold text-green">
                {cartCount}
              </span>
              <span className="font-bold">{cartTotal} DA</span>
            </div>
            <span className="flex items-center gap-1 font-semibold">
              VOIR LE PANIER <span className="text-xl">→</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
