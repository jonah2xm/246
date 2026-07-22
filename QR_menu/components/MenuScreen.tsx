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
  const { cartCount } = useCart();
  const activeCat = categories.find((c) => c.key === activeCategory) ?? categories[0];

  return (
    <div className="min-h-screen pb-8">
      <div className="sticky top-0 z-[5] flex items-center justify-between border-b border-border bg-bg/95 px-5 py-3.5 backdrop-blur-sm">
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

      <CategoryPills categories={categories} active={activeCat.key} onSelect={onSelectCategory} />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-5 pb-5 pt-3">
        {activeCat.items.map((it) => (
          <ItemCard key={it.id} item={it} onOpen={() => onOpenItem(activeCat.key, it)} />
        ))}
      </div>
    </div>
  );
}
