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
      <div className="sticky top-0 z-[5] flex items-center justify-between border-b border-border bg-bg/95 px-5 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="font-display text-2xl tracking-wide">
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
          className="relative flex items-center gap-2 rounded-xl border border-border bg-panel px-4 py-2.5 text-sm"
        >
          Panier
          {cartCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red px-[5px] text-xs text-white">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      <CategoryPills categories={categories} active={activeCat.key} onSelect={onSelectCategory} />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 px-5 pb-5 pt-3">
        {activeCat.items.map((it) => (
          <ItemCard key={it.id} item={it} onOpen={() => onOpenItem(activeCat.key, it)} />
        ))}
      </div>
    </div>
  );
}
