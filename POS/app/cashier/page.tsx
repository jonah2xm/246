"use client";

import { useEffect, useMemo, useState } from "react";
import RoleGate from "@/components/RoleGate";
import TopBar from "@/components/TopBar";
import OrderBuilder from "@/components/OrderBuilder";
import { useAuth } from "@/lib/auth-context";
import {
  getTodayOrders,
  markOrderPaid,
  printReceipt,
  createCounterOrder,
  updateOrderItems,
  updateOrderStatus,
} from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { StaffOrder } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  new: "Nouvelle",
  in_progress: "En cours",
  ready: "Prête",
  completed: "Terminée",
  cancelled: "Annulée",
};

const STATUS_STYLE: Record<string, string> = {
  new: "bg-panel-2 text-muted",
  in_progress: "bg-orange-soft text-orange",
  ready: "bg-green-soft text-green",
  completed: "bg-panel-2 text-muted",
  cancelled: "bg-red-soft text-red",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-panel px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 font-display text-xl text-green">{value}</div>
    </div>
  );
}

function CashierList() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [printedIds, setPrintedIds] = useState<Set<string>>(new Set());
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
  const [creating, setCreating] = useState(false);
  const [editingOrder, setEditingOrder] = useState<StaffOrder | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    getTodayOrders(token)
      .then(setOrders)
      .catch(() => setError("Impossible de charger les commandes."));

    const socket = getSocket(token);

    socket.on("order:new", (order: StaffOrder) => {
      setOrders((prev) => [order, ...prev]);
    });

    socket.on("order:updated", (order: StaffOrder) => {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
    });

    return () => {
      socket.off("order:new");
      socket.off("order:updated");
    };
  }, [token]);

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== "cancelled");
    const paid = active.filter((o) => o.payment.status === "paid");
    return {
      count: active.length,
      revenue: paid.reduce((s, o) => s + o.total, 0),
      pending: active.filter((o) => o.payment.status === "pending").length,
    };
  }, [orders]);

  const visible = useMemo(() => {
    if (filter === "pending") return orders.filter((o) => o.payment.status === "pending" && o.status !== "cancelled");
    if (filter === "paid") return orders.filter((o) => o.payment.status === "paid");
    return orders;
  }, [orders, filter]);

  async function handleMarkPaid(id: string) {
    if (!token) return;
    setPayingId(id);
    try {
      const updated = await markOrderPaid(token, id);
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    } catch {
      setError("Échec de l'encaissement.");
    } finally {
      setPayingId(null);
    }
  }

  async function handlePrint(id: string) {
    if (!token) return;
    setPrintingId(id);
    try {
      await printReceipt(token, id);
      setPrintedIds((prev) => new Set(prev).add(id));
    } catch {
      setError("Échec de l'impression.");
    } finally {
      setPrintingId(null);
    }
  }

  async function handleCancel(order: StaffOrder) {
    if (!token) return;
    if (!confirm(`Annuler la commande #${order.orderNumber} ?`)) return;
    setCancellingId(order.id);
    try {
      const updated = await updateOrderStatus(token, order.id, "cancelled");
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'annulation.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="min-h-screen">
      <TopBar />
      {error && <div className="mx-5 mt-3 rounded-xl bg-red-soft px-4 py-2.5 text-sm text-red">{error}</div>}

      <div className="grid grid-cols-3 gap-3 px-5 pt-4">
        <Stat label="Commandes aujourd'hui" value={String(stats.count)} />
        <Stat label="Encaissé" value={`${stats.revenue} DA`} />
        <Stat label="En attente de paiement" value={String(stats.pending)} />
      </div>

      <div className="flex items-center justify-between gap-2 px-5 pt-4">
        <div className="flex items-center gap-2">
          {([
            ["all", "Toutes"],
            ["pending", "À encaisser"],
            ["paid", "Payées"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                filter === key ? "bg-green text-[#08130a]" : "bg-panel text-muted hover:text-fg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCreating(true)}
          className="rounded-xl bg-green px-5 py-2 font-display text-base tracking-wide text-[#08130a] transition-colors hover:bg-green-hover"
        >
          + Nouvelle commande
        </button>
      </div>

      <div className="flex flex-col gap-2.5 p-5">
        {visible.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border py-14 text-center text-muted">
            Aucune commande dans cette vue.
          </div>
        )}
        {visible.map((order) => {
          const expanded = expandedId === order.id;
          return (
            <div key={order.id} className="overflow-hidden rounded-2xl border border-border bg-panel transition-colors">
              <button
                onClick={() => setExpandedId(expanded ? null : order.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="font-display text-2xl leading-none">#{order.orderNumber}</div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      {order.table ? (
                        <span className="rounded-full bg-green-soft px-2.5 py-0.5 text-[11px] font-semibold text-green">
                          Table {order.table}
                        </span>
                      ) : (
                        <span className="rounded-full bg-panel-2 px-2.5 py-0.5 text-[11px] text-muted">Comptoir</span>
                      )}
                      {order.source === "counter" && (
                        <span className="rounded-full bg-orange-soft px-2.5 py-0.5 text-[11px] font-semibold text-orange">
                          CAISSE
                        </span>
                      )}
                      {order.scheduledFor && (
                        <span className="rounded-full bg-orange-soft px-2.5 py-0.5 text-[11px] font-semibold text-orange">
                          Prévu{" "}
                          {new Date(order.scheduledFor).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted">
                      {new Date(order.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} ·{" "}
                      {order.items.reduce((s, it) => s + it.qty, 0)} article(s)
                      {order.customerPhone ? ` · ${order.customerPhone}` : ""}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[order.status]}`}>
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                  <span className="text-xs text-muted">{order.payment.method === "cash" ? "Espèces" : "TPE"}</span>
                  <span className="font-display text-lg text-green">{order.total} DA</span>
                  <span className={`text-xs text-muted transition-transform ${expanded ? "rotate-180" : ""}`}>▼</span>
                </div>
              </button>

              {expanded && (
                <div className="border-t border-border bg-panel-2/50 px-4 py-3.5">
                  <div className="flex flex-col gap-2">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex items-start justify-between text-sm">
                        <div>
                          <span className="font-medium">
                            {it.qty}× {it.name} <span className="text-muted">({it.sizeLabel})</span>
                          </span>
                          {it.supplements.length > 0 && (
                            <div className="text-xs text-muted">+ {it.supplements.join(", ")}</div>
                          )}
                          {it.comboSelections.length > 0 && (
                            <div className="text-xs text-muted">
                              {it.comboSelections.map((s) => `${s.name} (${s.sizeLabel})`).join(", ")}
                            </div>
                          )}
                        </div>
                        <span className="text-muted">{it.unitPrice * it.qty} DA</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                    <div className="text-xs text-muted">
                      {order.payment.status === "paid" && order.payment.paidAt
                        ? `Encaissée à ${new Date(order.payment.paidAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
                        : "Paiement en attente"}
                    </div>
                    <div className="flex items-center gap-2.5">
                      {order.status === "new" && order.payment.status === "pending" && (
                        <button
                          onClick={() => setEditingOrder(order)}
                          className="rounded-full border border-border px-4 py-1.5 text-xs text-muted transition-colors hover:border-green hover:text-fg"
                        >
                          Modifier
                        </button>
                      )}
                      {(order.status === "new" || order.status === "in_progress") && (
                        <button
                          onClick={() => handleCancel(order)}
                          disabled={cancellingId === order.id}
                          className="rounded-full border border-border px-4 py-1.5 text-xs text-muted transition-colors hover:border-red hover:text-red disabled:opacity-60"
                        >
                          {cancellingId === order.id ? "…" : "Annuler"}
                        </button>
                      )}
                      <button
                        onClick={() => handlePrint(order.id)}
                        disabled={printingId === order.id}
                        className="rounded-full border border-border px-4 py-1.5 text-xs text-muted transition-colors hover:border-green hover:text-fg disabled:opacity-60"
                      >
                        {printingId === order.id ? "…" : printedIds.has(order.id) ? "Réimprimer reçu" : "Imprimer reçu"}
                      </button>
                      {order.payment.status === "paid" ? (
                        <span className="rounded-full bg-green-soft px-4 py-1.5 text-xs font-semibold text-green">PAYÉ</span>
                      ) : order.status !== "cancelled" ? (
                        <button
                          onClick={() => handleMarkPaid(order.id)}
                          disabled={payingId === order.id}
                          className="rounded-full bg-green px-4 py-1.5 text-xs font-semibold text-[#08130a] transition-colors hover:bg-green-hover disabled:opacity-60"
                        >
                          {payingId === order.id ? "…" : "Encaisser"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {creating && (
        <OrderBuilder
          title="Nouvelle commande — Caisse"
          showCheckoutOptions
          submitLabel="Envoyer en cuisine"
          onClose={() => setCreating(false)}
          onSubmit={async (lines, opts) => {
            await createCounterOrder({ items: lines, paymentMethod: opts.paymentMethod, tableSlug: opts.tableSlug });
            setCreating(false);
          }}
        />
      )}

      {editingOrder && (
        <OrderBuilder
          title={`Modifier — commande #${editingOrder.orderNumber}`}
          initialLines={editingOrder.items.map((it) => ({
            name: it.name,
            sizeLabel: it.sizeLabel,
            unitPrice: it.unitPrice,
            qty: it.qty,
            supplements: it.supplements,
            comboSelections: it.comboSelections,
          }))}
          showCheckoutOptions={false}
          submitLabel="Enregistrer les modifications"
          onClose={() => setEditingOrder(null)}
          onSubmit={async (lines) => {
            if (!token) return;
            const updated = await updateOrderItems(token, editingOrder.id, lines);
            setOrders((prev) => prev.map((o) => (o.id === editingOrder.id ? updated : o)));
            setEditingOrder(null);
          }}
        />
      )}
    </div>
  );
}

export default function CashierPage() {
  return (
    <RoleGate allow={["cashier", "manager"]}>
      <CashierList />
    </RoleGate>
  );
}
