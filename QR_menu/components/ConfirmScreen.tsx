"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { submitFeedback } from "@/lib/api";
import { OrderStatus, PaymentMethod } from "@/lib/types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Reçue",
  in_progress: "En préparation",
  ready: "Prête — passez au comptoir",
  completed: "Récupérée",
  cancelled: "Annulée",
};

const STATUS_STEPS: OrderStatus[] = ["new", "in_progress", "ready"];

export default function ConfirmScreen({
  orderId,
  orderNumber,
  paymentMethod,
  confirmSubtext,
  scheduledFor,
  loyaltyPoints,
  onNewOrder,
}: {
  orderId: string;
  orderNumber: number;
  paymentMethod: PaymentMethod;
  confirmSubtext: string;
  scheduledFor: string | null;
  loyaltyPoints: { earned: number; balance: number } | null;
  onNewOrder: () => void;
}) {
  const [status, setStatus] = useState<OrderStatus>("new");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");

  useEffect(() => {
    const socket = getSocket();
    socket.emit("order:watch", orderId);

    function handleStatus(update: {
      status: OrderStatus;
      payment: { status: "pending" | "paid" };
    }) {
      setStatus(update.status);
      setPaymentStatus(update.payment.status);
    }

    socket.on("order:status", handleStatus);
    return () => {
      socket.off("order:status", handleStatus);
    };
  }, [orderId]);

  const stepIndex = STATUS_STEPS.indexOf(status);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-[18px] px-6 py-10 text-center">
      <div className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-green text-[42px] text-[#08130a] animate-scale-in">
        ✓
      </div>
      <div className="font-display text-[26px] animate-fade-in-up">COMMANDE ENVOYÉE</div>
      <div className="text-sm text-muted animate-fade-in-up" style={{ animationDelay: "0.05s" }}>Numéro de commande</div>
      <div className="font-display text-[38px] text-green animate-fade-in-up" style={{ animationDelay: "0.1s" }}>#{orderNumber}</div>

      {scheduledFor && (
        <div className="rounded-full bg-panel px-4 py-1.5 text-xs text-muted animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          Retrait prévu à{" "}
          {new Date(scheduledFor).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}

      {status !== "cancelled" && (
        <div className="flex items-center gap-2 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          {STATUS_STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-2 w-10 rounded-full transition-colors duration-500 ${i <= stepIndex ? "bg-green" : "bg-panel-2"}`}
            />
          ))}
        </div>
      )}

      <div className="font-display text-lg tracking-wide text-green">{STATUS_LABEL[status]}</div>

      <div className="flex items-center gap-2 text-[13px] text-muted">
        <span>{paymentMethod === "cash" ? "Espèces" : "Carte (TPE)"}</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            paymentStatus === "paid" ? "bg-green-soft text-green" : "bg-panel-2 text-muted"
          }`}
        >
          {paymentStatus === "paid" ? "PAYÉ" : "À RÉGLER AU COMPTOIR"}
        </span>
      </div>

      {loyaltyPoints && (
        <div className="text-[13px] text-muted">
          +{loyaltyPoints.earned} points fidélité · solde {loyaltyPoints.balance}
        </div>
      )}

      <div className="max-w-[280px] text-[13px] text-muted">{confirmSubtext}</div>

      {status === "completed" ? (
        <FeedbackForm orderId={orderId} />
      ) : (
        <button
          onClick={onNewOrder}
          className="mt-2 min-h-11 rounded-full bg-panel px-8 py-3.5 text-sm text-fg transition-colors motion-safe:active:scale-95 hover:bg-panel-2"
        >
          Retour au menu
        </button>
      )}
    </div>
  );
}

function FeedbackForm({ orderId }: { orderId: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    if (rating === 0) return;
    setSending(true);
    try {
      await submitFeedback(orderId, rating, comment);
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return <div className="mt-2 text-sm text-green animate-fade-in-up">Merci pour votre avis !</div>;
  }

  return (
    <div className="mt-2 flex w-full max-w-[280px] flex-col items-center gap-3 animate-fade-in-up">
      <div className="text-sm text-muted">Comment était votre commande ?</div>
      <div className="flex gap-1.5 text-2xl">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            className={`transition-colors motion-safe:active:scale-90 ${n <= rating ? "text-green" : "text-panel-2"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Un commentaire ? (facultatif)"
        rows={2}
        className="w-full min-h-11 rounded-xl border border-border bg-panel px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-green"
      />
      <button
        onClick={handleSubmit}
        disabled={rating === 0 || sending}
        className="min-h-11 rounded-full bg-green px-8 py-2.5 text-sm font-semibold text-[#08130a] transition-colors motion-safe:active:scale-95 hover:bg-green-hover disabled:opacity-50"
      >
        {sending ? "…" : "Envoyer"}
      </button>
    </div>
  );
}
