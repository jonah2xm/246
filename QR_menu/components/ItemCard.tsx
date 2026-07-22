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
      className={`group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200 select-none touch-manipulation motion-safe:active:scale-[0.98] ${
        item.highlight
          ? "border-green/80 bg-panel shadow-md shadow-green/10"
          : "border-border/80 bg-panel hover:border-green/60 hover:shadow-lg hover:shadow-black/20"
      } ${!item.available ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {/* Top Image Container */}
      <div className="relative h-[150px] sm:h-[170px] w-full overflow-hidden bg-panel-2">
        {item.photo ? (
          <Image
            src={item.photo}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, 360px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <PhotoPlaceholder name={item.name} />
        )}

        {/* Subtle dark gradient overlay at bottom of photo */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-panel/90 to-transparent pointer-events-none" />

        {!item.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/65 backdrop-blur-[2px]">
            <span className="rounded-full bg-red px-3.5 py-1 text-xs font-bold tracking-wide text-white shadow-md">
              ÉPUISÉ
            </span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute left-2.5 top-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
          {item.highlight ? (
            <span className="rounded-full bg-green/95 backdrop-blur-md px-2.5 py-0.5 font-display text-[11px] tracking-wider text-[#08130a] font-bold shadow-md">
              ★ RECOMMANDÉ
            </span>
          ) : (
            <span />
          )}

          {item.badge && (
            <span className="rounded-full bg-red/95 backdrop-blur-md px-2.5 py-0.5 font-display text-[10px] tracking-wider text-white font-bold shadow-md">
              {item.badge}
            </span>
          )}
        </div>
      </div>

      {/* Card Details Below Image */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="font-display text-[19px] leading-tight tracking-wide text-fg group-hover:text-green transition-colors">
          {item.name}
        </div>
        {item.desc && (
          <div className="text-[12.5px] leading-relaxed text-muted line-clamp-2">
            {item.desc}
          </div>
        )}

        {/* Styled Price Pills */}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2.5">
          {item.sizes.map((sz) => (
            <span
              key={sz.label}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-panel-2 px-2.5 py-1 text-xs font-semibold"
            >
              <span className="text-muted text-[11px]">{sz.label}</span>
              <span className="text-green font-bold">{sz.price} DA</span>
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
