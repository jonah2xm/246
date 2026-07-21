"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import RoleGate from "@/components/RoleGate";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/lib/auth-context";
import { getTables } from "@/lib/api";
import { TableInfo } from "@/lib/types";

const CUSTOMER_URL = process.env.NEXT_PUBLIC_CUSTOMER_URL || "http://localhost:3000";

interface QrEntry {
  title: string;
  subtitle: string;
  url: string;
  dataUrl: string;
  accent: boolean;
}

function QrBoard() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<QrEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    async function build() {
      try {
        const tables = (await getTables(token!)) as TableInfo[];
        const defs = [
          {
            title: "À EMPORTER",
            subtitle: "Comptoir — commande sans table",
            url: CUSTOMER_URL,
            accent: true,
          },
          ...tables.map((t) => ({
            title: `TABLE ${t.label}`,
            subtitle: `${t.capacity} places`,
            url: `${CUSTOMER_URL}/?table=${t.qrSlug}`,
            accent: false,
          })),
        ];
        const withQr = await Promise.all(
          defs.map(async (d) => ({
            ...d,
            dataUrl: await QRCode.toDataURL(d.url, { width: 320, margin: 1, color: { dark: "#0d0f0e", light: "#ffffff" } }),
          }))
        );
        setEntries(withQr);
      } catch {
        setError("Impossible de générer les QR codes.");
      }
    }
    build();
  }, [token]);

  return (
    <div className="min-h-screen">
      <div className="print:hidden">
        <TopBar />
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="text-sm text-muted">
            Le premier QR est celui du <span className="text-fg">comptoir / à emporter</span> — les commandes scannées
            dessus arrivent sans table. Les autres sont à imprimer et coller sur chaque table.
          </div>
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-green px-5 py-2 font-display text-base tracking-wide text-[#08130a] transition-colors hover:bg-green-hover"
          >
            Imprimer
          </button>
        </div>
        {error && <div className="mx-5 mt-3 rounded-xl bg-red-soft px-4 py-2.5 text-sm text-red">{error}</div>}
      </div>

      <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2 print:gap-8">
        {entries.map((e) => (
          <div
            key={e.url}
            className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center print:break-inside-avoid print:border-black ${
              e.accent ? "border-green bg-green-soft" : "border-border bg-panel"
            }`}
          >
            <div className="font-display text-2xl tracking-wide print:text-black">
              24<span className="text-green">6</span>
            </div>
            <div className={`font-display text-xl ${e.accent ? "text-green" : ""} print:text-black`}>{e.title}</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.dataUrl} alt={`QR ${e.title}`} className="h-52 w-52 rounded-xl bg-white p-2" />
            <div className="text-xs text-muted print:text-black">{e.subtitle}</div>
            <div className="break-all text-[10px] text-muted print:text-black">{e.url}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QrCodesPage() {
  return (
    <RoleGate allow={["cashier", "manager"]}>
      <QrBoard />
    </RoleGate>
  );
}
