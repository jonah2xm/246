"use client";

import Image from "next/image";
import { MenuItemDTO } from "@/lib/types";
import PhotoPlaceholder from "./PhotoPlaceholder";

export default function ItemCard({
  item,
  onOpen,
}: {
  item: MenuItemDTO;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={item.available ? onOpen : undefined}
      disabled={!item.available}
      className={`flex flex-col overflow-hidden rounded-2xl border text-left transition-colors motion-safe:active:scale-[0.97] ${
        item.highlight ? "border-green" : "border-border hover:border-green"
      } ${!item.available ? "opacity-50 cursor-not-allowed" : ""} bg-panel`}
    >
      <div className="relative h-[140px] sm:h-[160px] md:h-[180px] w-full overflow-hidden bg-panel-2">
        {item.photo ? (
          <Image
            src={item.photo}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 45vw, 280px"
            className="object-cover"
          />
        ) : (
          <PhotoPlaceholder name={item.name} />
        )}
        {!item.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/65">
            <span className="rounded-full bg-red px-3 py-1.5 text-xs font-bold text-white">
              ÉPUISÉ
            </span>
          </div>
        )}
        {item.badge && (
          <span className="absolute right-2 top-2 z-10 -rotate-3 rounded-md bg-red px-2.5 py-1 font-display text-[10px] tracking-wide text-white">
            {item.badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <div className="font-display text-lg leading-tight tracking-wide">{item.name}</div>
        <div className="text-[12px] leading-snug text-muted line-clamp-2">{item.desc}</div>
        <div className="mt-auto flex gap-3 pt-1.5">
          {item.sizes.map((sz) => (
            <div key={sz.label} className="text-sm font-semibold text-green">
              {sz.label} <span className="text-fg">{sz.price} DA</span>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
}
