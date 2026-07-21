"use client";

import { hueForName } from "@/lib/placeholder";

// Square image tile used across the admin catalog (menu items, ingredients).
// Falls back to a deterministic colored gradient when there's no photo, so
// every tile still reads as a distinct product at a glance in the grid.
export default function PhotoTile({ src, name }: { src?: string; name: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name} className="h-full w-full object-cover" />
    );
  }
  const hue = hueForName(name);
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: `linear-gradient(135deg, oklch(0.32 0.05 ${hue}), oklch(0.2 0.03 ${hue}))` }}
    >
      <span className="px-2 text-center font-display text-lg leading-tight tracking-wide text-fg/70">{name}</span>
    </div>
  );
}
