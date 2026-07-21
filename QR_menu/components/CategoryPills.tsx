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
    <div className="flex gap-2.5 overflow-x-auto px-5 pb-2 pt-5">
      {categories.map((cat) => {
        const isActive = cat.key === active;
        return (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className={`flex-none rounded-full border px-5 py-2.5 font-display text-[15px] tracking-wide transition-colors ${
              isActive
                ? "border-green bg-green text-[#08130a]"
                : "border-border bg-transparent text-fg"
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
