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
    <div
      className={`relative flex flex-col gap-2 rounded-[14px] border bg-panel p-3 pb-4 ${
        item.highlight ? "border-green" : "border-border"
      } ${!item.available ? "opacity-50" : ""}`}
    >
      <div className="relative h-[150px] overflow-hidden rounded-[10px]">
        {item.photo ? (
          <Image
            src={item.photo}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 90vw, 280px"
            className="object-cover"
          />
        ) : (
          <PhotoPlaceholder name={item.name} />
        )}
        {!item.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-md bg-red px-3 py-1 font-display text-xs tracking-wide text-white">
              ÉPUISÉ
            </span>
          </div>
        )}
      </div>

      {item.badge && (
        <div className="pointer-events-none absolute right-4 top-1 z-10 -rotate-3 rounded-md bg-red px-2.5 py-1 font-display text-[10px] tracking-wide text-white">
          {item.badge}
        </div>
      )}

      <div
        onClick={item.available ? onOpen : undefined}
        className={`flex flex-1 flex-col gap-2 px-1.5 ${item.available ? "cursor-pointer" : "cursor-not-allowed"}`}
      >
        <div className="font-display text-[22px] tracking-wide">{item.name}</div>
        <div className="text-[13px] leading-snug text-muted">{item.desc}</div>
        <div className="mt-auto flex gap-3.5 pt-1.5">
          {item.sizes.map((sz) => (
            <div key={sz.label} className="text-sm font-bold text-green">
              {sz.label} <span className="text-fg">{sz.price} DA</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
