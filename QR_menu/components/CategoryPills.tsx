"use client";

import { Category } from "@/lib/types";

export default function CategoryPills({
  categories,
  active,
  onSelect,
}: {
  categories: Category[];
  active: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="flex gap-2.5 overflow-x-auto px-5 pb-2 pt-5 select-none touch-pan-x">
      {categories.map((cat) => {
        const isActive = cat.key === active;
        return (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className={`flex-none min-h-12 rounded-full px-5 py-3 text-sm font-semibold tracking-wide transition-all motion-safe:active:scale-95 ${
              isActive
                ? "bg-green text-[#08130a] shadow-md shadow-green/20"
                : "border border-border bg-panel text-muted hover:text-fg hover:border-green/50"
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
