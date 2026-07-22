"use client";

import { useMemo } from "react";
import { buildQrCells } from "@/lib/qr-grid";

export default function ScanScreen({ onEnter }: { onEnter: () => void }) {
  const cells = useMemo(() => buildQrCells(11), []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <div className="font-display text-lg tracking-[4px] text-green">
        SCANNEZ POUR COMMANDER
      </div>
      <div className="font-display text-[88px] leading-[0.9] tracking-wide">
        24<span className="text-green">6</span>
      </div>
      <div className="animate-qr-pulse rounded-[18px] bg-fg p-3.5">
        <div className="grid grid-cols-11 grid-rows-11 gap-0">
          {cells.map((on, i) => (
            <div key={i} className={`h-4 w-4 ${on ? "bg-black" : "bg-white"}`} />
          ))}
        </div>
      </div>
      <div className="text-[13px] tracking-wide text-muted">
        Pizzeria • Livraison &amp; sur place
      </div>
      <button
        onClick={onEnter}
        className="mt-1.5 rounded-full bg-green px-11 py-4 font-display text-[19px] tracking-widest text-[#08130a] transition-colors motion-safe:active:scale-95 hover:bg-green-hover"
      >
        VOIR LE MENU
      </button>
    </div>
  );
}
