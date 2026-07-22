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
    <div className="flex gap-2 overflow-x-auto px-5 pb-2 pt-5">
      {categories.map((cat) => {
        const isActive = cat.key === active;
        return (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className={`flex-none min-h-11 rounded-full border px-5 py-2.5 text-sm font-medium tracking-wide transition-colors motion-safe:active:scale-95 ${
              isActive
                ? "border-green bg-green text-[#08130a] font-semibold"
                : "border-border bg-transparent text-fg hover:bg-panel hover:text-fg"
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
