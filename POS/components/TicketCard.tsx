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
      className={`flex flex-col gap-3 rounded-2xl border p-4 transition-shadow ${agingClass(
        order.createdAt,
        now
      )} ${isFresh ? "animate-pulse ring-2 ring-green" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="font-display text-[26px] leading-none">#{order.orderNumber}</div>
            {order.table && (
              <span className="rounded-full bg-green-soft px-2 py-0.5 text-[10px] font-semibold text-green">
                {order.table}
              </span>
            )}
            {order.source === "counter" && (
              <span className="rounded-full bg-orange-soft px-2 py-0.5 text-[10px] font-semibold text-orange">
                CAISSE
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-muted">{receivedAt} · {STATUS_LABEL[order.status]}</div>
          {order.scheduledFor && (
            <div className="mt-1 inline-block rounded-full bg-orange-soft px-2 py-0.5 text-[10px] font-semibold text-orange">
              PRÉVU {new Date(order.scheduledFor).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              order.payment.status === "paid" ? "bg-green-soft text-green" : "bg-panel-2 text-muted"
            }`}
          >
            {order.payment.status === "paid" ? "PAYÉ" : "EN ATTENTE"}
          </span>
          <span className="text-[10px] text-muted">
            {order.payment.method === "cash" ? "Espèces" : "TPE"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        {order.items.map((it, idx) => (
          <div key={idx} className="text-sm">
            <div className="flex justify-between">
              <span className="font-medium">
                {it.qty}× {it.name} <span className="text-muted">({it.sizeLabel})</span>
              </span>
              <span className="text-[10px] uppercase text-muted">{it.station}</span>
            </div>
            {it.supplements.length > 0 && (
              <div className="text-[12px] text-muted">{it.supplements.join(", ")}</div>
            )}
            {it.comboSelections.length > 0 && (
              <div className="text-[12px] text-muted">
                {it.comboSelections.map((s) => `${s.name} (${s.sizeLabel})`).join(", ")}
              </div>
            )}
          </div>
        ))}
      </div>

      {nextStatus && (
        <button
          onClick={() => onAdvance(order.id, nextStatus)}
          className="mt-1 rounded-xl bg-green py-2.5 font-display text-base tracking-wide text-[#08130a]"
        >
          {ACTION_LABEL[order.status]}
        </button>
      )}
    </div>
  );
}
