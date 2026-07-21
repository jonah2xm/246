"use client";

import { StaffOrder, OrderStatus } from "@/lib/types";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  new: "in_progress",
  in_progress: "ready",
  ready: "completed",
};

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  new: "Commencer",
  in_progress: "Prêt",
  ready: "Terminé",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Nouvelle",
  in_progress: "En cours",
  ready: "Prête",
  completed: "Terminée",
  cancelled: "Annulée",
};

function agingClass(createdAt: string, now: number): string {
  const minutes = (now - new Date(createdAt).getTime()) / 60000;
  if (minutes >= 10) return "border-red bg-red-soft";
  if (minutes >= 5) return "border-orange bg-orange-soft";
  return "border-border bg-panel";
}

export default function TicketCard({
  order,
  now,
  isFresh,
  onAdvance,
}: {
  order: StaffOrder;
  now: number;
  isFresh: boolean;
  onAdvance: (id: string, status: OrderStatus) => void;
}) {
  const nextStatus = NEXT_STATUS[order.status];
  const receivedAt = new Date(order.createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`flex flex-col gap-3.5 rounded-2xl border-2 p-4 transition-shadow ${agingClass(
        order.createdAt,
        now
      )} ${isFresh ? "animate-pulse ring-2 ring-green" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="font-display text-[34px] leading-none">#{order.orderNumber}</div>
            {order.table && (
              <span className="rounded-full bg-green-soft px-2.5 py-1 text-xs font-semibold text-green">
                {order.table}
              </span>
            )}
            {order.source === "counter" && (
              <span className="rounded-full bg-orange-soft px-2.5 py-1 text-xs font-semibold text-orange">
                CAISSE
              </span>
            )}
          </div>
          <div className="mt-1.5 text-xs text-muted">{receivedAt} · {STATUS_LABEL[order.status]}</div>
          {order.scheduledFor && (
            <div className="mt-1.5 inline-block rounded-full bg-orange-soft px-2.5 py-1 text-xs font-semibold text-orange">
              PRÉVU {new Date(order.scheduledFor).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              order.payment.status === "paid" ? "bg-green-soft text-green" : "bg-panel-2 text-muted"
            }`}
          >
            {order.payment.status === "paid" ? "PAYÉ" : "EN ATTENTE"}
          </span>
          <span className="text-xs text-muted">
            {order.payment.method === "cash" ? "Espèces" : "TPE"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 border-t border-border pt-3.5">
        {order.items.map((it, idx) => (
          <div key={idx} className="text-[15px]">
            <div className="flex justify-between gap-2">
              <span className="font-medium">
                {it.qty}× {it.name} <span className="text-muted">({it.sizeLabel})</span>
              </span>
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                {it.station}
              </span>
            </div>
            {it.supplements.length > 0 && (
              <div className="text-sm text-muted">{it.supplements.join(", ")}</div>
            )}
            {it.comboSelections.length > 0 && (
              <div className="text-sm text-muted">
                {it.comboSelections.map((s) => `${s.name} (${s.sizeLabel})`).join(", ")}
              </div>
            )}
          </div>
        ))}
      </div>

      {nextStatus && (
        <button
          onClick={() => onAdvance(order.id, nextStatus)}
          className="mt-1 min-h-[60px] rounded-xl bg-green py-3 font-display text-xl tracking-wide text-[#08130a] transition-transform motion-safe:active:scale-[0.97]"
        >
          {ACTION_LABEL[order.status]?.toUpperCase()}
        </button>
      )}
    </div>
  );
}
