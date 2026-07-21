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
        <button onClick={onBack} className="text-sm text-green">
          ← Menu
        </button>
        <div className="font-display text-[22px]">MON PANIER</div>
      </div>

      {cart.length > 0 ? (
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-3">
            {cart.map((ci) => (
              <div
                key={ci.id}
                className="flex justify-between gap-3 rounded-[14px] bg-panel p-4"
              >
                <div className="flex flex-col gap-1">
                  <div className="font-display text-[17px]">
                    {ci.name}{" "}
                    <span className="text-[13px] text-muted">({ci.sizeLabel})</span>
                  </div>
                  <div className="text-xs text-muted">
                    {ci.comboSelections.length
                      ? ci.comboSelections.map((s) => s.name).join(", ")
                      : ci.supplements.length
                        ? ci.supplements.join(", ")
                        : "Sans supplément"}
                  </div>
                  <div className="mt-1 flex items-center gap-2.5">
                    <button
                      onClick={() => dec(ci.id)}
                      disabled={ci.comboSelections.length > 0}
                      className="h-[26px] w-[26px] rounded-md border border-border text-sm disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="text-sm">{ci.qty}</span>
                    <button
                      onClick={() => inc(ci.id)}
                      disabled={ci.comboSelections.length > 0}
                      className="h-[26px] w-[26px] rounded-md border border-border text-sm disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button onClick={() => remove(ci.id)} className="text-[13px] text-red">
                    Retirer
                  </button>
                  <div className="text-base font-bold text-green">
                    {ci.unitPrice * ci.qty} DA
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
            <div className="text-sm text-muted">Retrait</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setScheduledFor(null)}
                className={`flex-none rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                  scheduledFor === null ? "border-green bg-green-soft text-green" : "border-border text-muted"
                }`}
              >
                Dès que possible
              </button>
              {slots.map((s) => (
                <button
                  key={s.iso}
                  onClick={() => setScheduledFor(s.iso)}
                  className={`flex-none rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                    scheduledFor === s.iso ? "border-green bg-green-soft text-green" : "border-border text-muted"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="text-sm text-muted">Mode de paiement</div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setPaymentMethod("cash")}
                className={`rounded-xl border py-3 text-sm font-medium transition-colors ${
                  paymentMethod === "cash"
                    ? "border-green bg-green-soft text-green"
                    : "border-border text-muted"
                }`}
              >
                Espèces
              </button>
              <button
                onClick={() => setPaymentMethod("tpe")}
                className={`rounded-xl border py-3 text-sm font-medium transition-colors ${
                  paymentMethod === "tpe"
                    ? "border-green bg-green-soft text-green"
                    : "border-border text-muted"
                }`}
              >
                Carte (TPE)
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="text-sm text-muted">Téléphone (points fidélité, facultatif)</div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="06 12 34 56 78"
                className="rounded-xl border border-border bg-panel px-4 py-3 text-sm outline-none focus:border-green"
              />
            </div>

            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{cartTotal} DA</span>
            </div>
            <button
              onClick={() => onPlaceOrder(paymentMethod, { scheduledFor, customerPhone: phone.trim() || null })}
              disabled={placing}
              className="rounded-2xl bg-green py-4 font-display text-lg tracking-wide text-[#08130a] disabled:opacity-60"
            >
              {placing ? "…" : CHECKOUT_LABEL[mode]}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted">
          <div className="text-sm">Votre panier est vide</div>
          <button
            onClick={onBack}
            className="rounded-full border border-green px-7 py-3 text-sm text-green"
          >
            Voir le menu
          </button>
        </div>
      )}
    </div>
  );
}
