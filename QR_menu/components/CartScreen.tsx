"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { OrderMode, PaymentMethod } from "@/lib/types";

const CHECKOUT_LABEL: Record<OrderMode, string> = {
  table: "ENVOYER LA COMMANDE",
  delivery: "COMMANDER",
};

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
}: {
  mode: OrderMode;
  onBack: () => void;
  onPlaceOrder: (paymentMethod: PaymentMethod, options: { scheduledFor: string | null; customerPhone: string | null }) => void;
  placing: boolean;
}) {
  const { cart, cartTotal, inc, dec, remove } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [phone, setPhone] = useState("");

  const slots = useMemo(() => buildSlots(), []);

  return (
    <div className="flex min-h-screen flex-col gap-4 px-5 py-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="min-h-11 rounded-xl border border-border px-4 py-2.5 text-sm text-green transition-colors motion-safe:active:scale-95 hover:border-green"
        >
          ← Menu
        </button>
        <div className="font-display text-[22px] tracking-wide">MON PANIER</div>
      </div>

      {cart.length > 0 ? (
        <div className="flex flex-1 flex-col">
          {/* Cart items container — POS sidebar style */}
          <div className="flex flex-col gap-2">
            {cart.map((ci) => (
              <div
                key={ci.id}
                className="flex justify-between gap-3 rounded-xl bg-panel-2 p-3.5"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="font-display text-[17px] leading-tight">
                    {ci.name}{" "}
                    <span className="text-[13px] text-muted">({ci.sizeLabel})</span>
                  </div>
                  <div className="truncate text-[11px] text-muted">
                    {ci.comboSelections.length
                      ? ci.comboSelections.map((s) => s.name).join(", ")
                      : ci.supplements.length
                        ? ci.supplements.join(", ")
                        : "Sans supplément"}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      onClick={() => dec(ci.id)}
                      disabled={ci.comboSelections.length > 0}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-sm transition-colors motion-safe:active:scale-90 disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="min-w-[16px] text-center text-sm">{ci.qty}</span>
                    <button
                      onClick={() => inc(ci.id)}
                      disabled={ci.comboSelections.length > 0}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-green text-sm text-green transition-colors motion-safe:active:scale-90 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between shrink-0">
                  <button
                    onClick={() => remove(ci.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-base text-muted transition-colors hover:text-red"
                  >
                    ✕
                  </button>
                  <div className="font-display text-base text-green">
                    {ci.unitPrice * ci.qty} DA
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-3.5 border-t border-border pt-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted">Retrait</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setScheduledFor(null)}
                className={`flex-none min-h-11 rounded-full border px-4 py-2.5 text-xs font-medium transition-colors motion-safe:active:scale-95 ${
                  scheduledFor === null ? "border-green bg-green-soft text-green" : "border-border text-muted hover:border-green/50"
                }`}
              >
                Dès que possible
              </button>
              {slots.map((s) => (
                <button
                  key={s.iso}
                  onClick={() => setScheduledFor(s.iso)}
                  className={`flex-none min-h-11 rounded-full border px-4 py-2.5 text-xs font-medium transition-colors motion-safe:active:scale-95 ${
                    scheduledFor === s.iso ? "border-green bg-green-soft text-green" : "border-border text-muted hover:border-green/50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="text-xs font-medium uppercase tracking-wide text-muted">Mode de paiement</div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setPaymentMethod("cash")}
                className={`min-h-11 rounded-xl border-2 py-3 text-sm font-medium transition-colors motion-safe:active:scale-95 ${
                  paymentMethod === "cash"
                    ? "border-green bg-green-soft text-green"
                    : "border-border text-muted hover:border-green/50"
                }`}
              >
                Espèces
              </button>
              <button
                onClick={() => setPaymentMethod("tpe")}
                className={`min-h-11 rounded-xl border-2 py-3 text-sm font-medium transition-colors motion-safe:active:scale-95 ${
                  paymentMethod === "tpe"
                    ? "border-green bg-green-soft text-green"
                    : "border-border text-muted hover:border-green/50"
                }`}
              >
                Carte (TPE)
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="text-xs font-medium uppercase tracking-wide text-muted">Téléphone (points fidélité, facultatif)</div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="06 12 34 56 78"
                className="min-h-11 rounded-xl border border-border bg-panel px-4 py-3 text-sm outline-none transition-colors focus:border-green"
              />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3.5">
              <span className="font-display text-lg">Total</span>
              <span className="font-display text-2xl text-green">{cartTotal} DA</span>
            </div>
            <button
              onClick={() => onPlaceOrder(paymentMethod, { scheduledFor, customerPhone: phone.trim() || null })}
              disabled={placing}
              className="h-14 rounded-2xl bg-green font-display text-xl tracking-wide text-[#08130a] transition-colors motion-safe:active:scale-[0.97] hover:bg-green-hover disabled:opacity-60"
            >
              {placing ? "…" : CHECKOUT_LABEL[mode]}
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
            className="min-h-11 rounded-full border border-green px-7 py-3 text-sm font-medium text-green transition-colors motion-safe:active:scale-95 hover:bg-green-soft"
          >
            Voir le menu
          </button>
        </div>
      )}
    </div>
  );
}
