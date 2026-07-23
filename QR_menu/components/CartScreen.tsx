"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { OrderMode, PaymentMethod } from "@/lib/types";

const CHECKOUT_LABEL: Record<OrderMode, string> = {
  table: "ENVOYER LA COMMANDE",
  delivery: "COMMANDER",
};

const UPDATE_LABEL = "METTRE À JOUR LA COMMANDE";

function buildSlots(): { label: string; iso: string }[] {
  const slots: { label: string; iso: string }[] = [];
  const start = new Date();
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15 + 15, 0, 0);
  for (let i = 0; i < 6; i++) {
    const d = new Date(start.getTime() + i * 15 * 60000);
    slots.push({ label: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }), iso: d.toISOString() });
  }
  return slots;
}

export default function CartScreen({
  mode,
  onBack,
  onPlaceOrder,
  placing,
  existingOrderNumber,
}: {
  mode: OrderMode;
  onBack: () => void;
  onPlaceOrder: (paymentMethod: PaymentMethod, options: { scheduledFor: string | null; customerPhone: string | null }) => void;
  placing: boolean;
  existingOrderNumber?: number | null;
}) {
  const { cart, cartTotal, inc, dec, remove } = useCart();
  const editing = !!existingOrderNumber;
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [phone, setPhone] = useState("");

  const slots = useMemo(() => buildSlots(), []);

  return (
    <div className="flex min-h-screen flex-col gap-4 px-4 py-5 select-none">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="min-h-12 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-green transition-colors motion-safe:active:scale-95 hover:border-green"
        >
          ← Menu
        </button>
        <div className="font-display text-[22px] tracking-wide">MON PANIER</div>
      </div>

      {cart.length > 0 ? (
        <div className="flex flex-1 flex-col pb-6">
          {/* Cart items list */}
          <div className="flex flex-col gap-2.5">
            {cart.map((ci) => (
              <div
                key={ci.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-panel p-4 shadow-sm"
              >
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="font-display text-[18px] leading-tight">
                    {ci.name}{" "}
                    <span className="text-[13px] text-muted">({ci.sizeLabel})</span>
                  </div>
                  <div className="truncate text-[12px] text-muted">
                    {ci.comboSelections.length
                      ? ci.comboSelections.map((s) => s.name).join(", ")
                      : ci.supplements.length
                        ? ci.supplements.join(", ")
                        : "Sans supplément"}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => dec(ci.id)}
                      disabled={ci.comboSelections.length > 0}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-panel-2 text-base font-bold transition-all motion-safe:active:scale-90 disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="min-w-[20px] text-center text-base font-bold">{ci.qty}</span>
                    <button
                      onClick={() => inc(ci.id)}
                      disabled={ci.comboSelections.length > 0}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-green bg-green-soft text-base font-bold text-green transition-all motion-safe:active:scale-90 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between h-full shrink-0 gap-3">
                  <button
                    onClick={() => remove(ci.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-base text-muted transition-colors hover:bg-red-soft hover:text-red"
                    aria-label="Supprimer"
                  >
                    ✕
                  </button>
                  <div className="font-display text-lg font-bold text-green">
                    {ci.unitPrice * ci.qty} DA
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-4 border-t border-border pt-4">
            {editing ? (
              <div className="rounded-xl border border-orange bg-orange-soft px-4 py-3 text-xs text-orange">
                Vous modifiez la commande <span className="font-bold">#{existingOrderNumber}</span>, pas encore
                envoyée en cuisine. Le mode de paiement et l&apos;heure de retrait restent ceux choisis au départ.
              </div>
            ) : (
              <>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted">Retrait</div>
                <div className="flex gap-2 overflow-x-auto pb-1 touch-pan-x">
                  <button
                    onClick={() => setScheduledFor(null)}
                    className={`flex-none min-h-12 rounded-full border px-5 py-3 text-xs font-semibold transition-all motion-safe:active:scale-95 ${
                      scheduledFor === null ? "border-green bg-green-soft text-green" : "border-border bg-panel text-muted hover:border-green/50"
                    }`}
                  >
                    Dès que possible
                  </button>
                  {slots.map((s) => (
                    <button
                      key={s.iso}
                      onClick={() => setScheduledFor(s.iso)}
                      className={`flex-none min-h-12 rounded-full border px-5 py-3 text-xs font-semibold transition-all motion-safe:active:scale-95 ${
                        scheduledFor === s.iso ? "border-green bg-green-soft text-green" : "border-border bg-panel text-muted hover:border-green/50"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="text-xs font-semibold uppercase tracking-wider text-muted">Mode de paiement</div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`min-h-12 rounded-xl border-2 py-3.5 text-sm font-semibold transition-all motion-safe:active:scale-95 ${
                      paymentMethod === "cash"
                        ? "border-green bg-green text-[#08130a] shadow-md shadow-green/20"
                        : "border-border bg-panel text-muted hover:border-green/50"
                    }`}
                  >
                    Espèces
                  </button>
                  <button
                    onClick={() => setPaymentMethod("tpe")}
                    className={`min-h-12 rounded-xl border-2 py-3.5 text-sm font-semibold transition-all motion-safe:active:scale-95 ${
                      paymentMethod === "tpe"
                        ? "border-green bg-green text-[#08130a] shadow-md shadow-green/20"
                        : "border-border bg-panel text-muted hover:border-green/50"
                    }`}
                  >
                    Carte (TPE)
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted">Téléphone (points fidélité, facultatif)</div>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    placeholder="06 12 34 56 78"
                    className="min-h-12 rounded-xl border border-border bg-panel px-4 py-3 text-sm outline-none transition-colors focus:border-green"
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="font-display text-xl">Total</span>
              <span className="font-display text-3xl text-green">{cartTotal} DA</span>
            </div>
            <button
              onClick={() => onPlaceOrder(paymentMethod, { scheduledFor, customerPhone: phone.trim() || null })}
              disabled={placing}
              className="h-14 w-full rounded-2xl bg-green font-display text-xl tracking-wide text-[#08130a] shadow-xl shadow-green/20 transition-all motion-safe:active:scale-[0.98] hover:bg-green-hover disabled:opacity-60"
            >
              {placing ? "…" : editing ? UPDATE_LABEL : CHECKOUT_LABEL[mode]}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="rounded-2xl border border-dashed border-border px-8 py-14 text-center text-sm text-muted">
            Votre panier est vide
          </div>
          <button
            onClick={onBack}
            className="min-h-12 rounded-full border border-green px-8 py-3.5 text-sm font-semibold text-green transition-all motion-safe:active:scale-95 hover:bg-green-soft"
          >
            Voir le menu
          </button>
        </div>
      )}
    </div>
  );
}
