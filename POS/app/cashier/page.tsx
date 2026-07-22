"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RoleGate from "@/components/RoleGate";
import TopBar from "@/components/TopBar";
import Modal, { btnGhost, inputCls } from "@/components/Modal";
import { useAuth } from "@/lib/auth-context";
import { getTodayOrders, getUnpaidOrders, getTables, markOrderPaid, printReceipt, updateOrderStatus } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { StaffOrder, TableInfo, TableStatus } from "@/lib/types";

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

const TABLE_STATUS_LABEL: Record<TableStatus, string> = {
  free: "Libre",
  occupied: "Occupée",
};

const TABLE_STATUS_COLOR: Record<TableStatus, string> = {
  free: "border-border bg-panel hover:border-green",
  occupied: "border-green bg-green-soft",
};

const TABLE_STATUS_DOT: Record<TableStatus, string> = {
  free: "bg-muted",
  occupied: "bg-green",
};

function PaymentFilterBar({
  value,
  onChange,
}: {
  value: "unpaid" | "paid" | "cancelled";
  onChange: (v: "unpaid" | "paid" | "cancelled") => void;
}) {
  return (
    <div className="flex items-center gap-2 px-5">
      {(
        [
          ["unpaid", "Non payé"],
          ["paid", "Payé"],
          ["cancelled", "Annulée"],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`min-h-11 rounded-full px-5 py-3 text-sm font-medium transition-colors motion-safe:active:scale-95 ${
            value === key ? "bg-green text-[#08130a]" : "bg-panel text-muted hover:text-fg"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-panel px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 font-display text-xl text-green">{value}</div>
    </div>
  );
}

function OrderTile({ order, onClick }: { order: StaffOrder; onClick: () => void }) {
  const isPaid = order.payment.status === "paid";
  const createdAt = new Date(order.createdAt);
  const isToday = createdAt.toDateString() === new Date().toDateString();
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[180px] flex-col gap-2.5 rounded-2xl border-2 p-4 text-left transition-colors motion-safe:active:scale-[0.97] ${
        isPaid ? "border-border bg-panel opacity-70 hover:opacity-100" : "border-orange bg-orange-soft hover:border-green"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-display text-3xl leading-none">#{order.orderNumber}</div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
            isPaid ? "bg-green-soft text-green" : "bg-orange text-[#3a1c00]"
          }`}
        >
          {isPaid ? "✓ Payé" : "À encaisser"}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLE[order.status]}`}>
          {STATUS_LABEL[order.status] || order.status}
        </span>
        {order.source === "counter" && (
          <span className="rounded-full bg-panel-2 px-2.5 py-1 text-[11px] font-semibold text-muted">CAISSE</span>
        )}
        {order.scheduledFor && (
          <span className="rounded-full bg-panel-2 px-2.5 py-1 text-[11px] font-semibold text-muted">
            Prévu {new Date(order.scheduledFor).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        {!isToday && (
          <span className="rounded-full bg-red-soft px-2.5 py-1 text-[11px] font-semibold text-red">
            {createdAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
          </span>
        )}
      </div>

      <div className="text-xs text-muted">
        {createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} ·{" "}
        {order.items.reduce((s, it) => s + it.qty, 0)} article(s)
        {order.customerPhone ? ` · ${order.customerPhone}` : ""}
      </div>

      <div className={`mt-auto flex items-center justify-between border-t pt-2.5 ${isPaid ? "border-border" : "border-orange/40"}`}>
        <span className="text-xs text-muted">{order.payment.method === "cash" ? "Espèces" : "TPE"}</span>
        <span className={`font-display text-xl ${isPaid ? "text-muted" : "text-orange"}`}>{order.total} DA</span>
      </div>
    </button>
  );
}

function CashierList() {
  const { token } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [unpaidCarryover, setUnpaidCarryover] = useState<StaffOrder[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [printedIds, setPrintedIds] = useState<Set<string>>(new Set());
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<StaffOrder | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cashGiven, setCashGiven] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [showCounter, setShowCounter] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<"unpaid" | "paid" | "cancelled">("unpaid");

  useEffect(() => {
    setCashGiven("");
  }, [detailOrder?.id]);

  useEffect(() => {
    setPaymentFilter("unpaid");
  }, [selectedTableId, showCounter]);

  async function refreshTables() {
    if (!token) return;
    try {
      setTables(await getTables(token));
    } catch {
      setError("Impossible de charger les tables.");
    }
  }

  useEffect(() => {
    if (!token) return;

    getTodayOrders(token)
      .then(setOrders)
      .catch(() => setError("Impossible de charger les commandes."));
    getUnpaidOrders(token)
      .then(setUnpaidCarryover)
      .catch(() => setError("Impossible de charger les commandes non payées."));
    refreshTables();

    const socket = getSocket(token);

    socket.on("order:new", (order: StaffOrder) => {
      setOrders((prev) => [order, ...prev]);
    });

    socket.on("order:updated", (order: StaffOrder) => {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
      setUnpaidCarryover((prev) => {
        if (order.payment.status === "paid") return prev.filter((o) => o.id !== order.id);
        return prev.some((o) => o.id === order.id) ? prev.map((o) => (o.id === order.id ? order : o)) : prev;
      });
      setDetailOrder((prev) => (prev && prev.id === order.id ? order : prev));
    });

    const tableEvents = ["table:updated", "table:closed", "table:merged", "table:split", "table:assigned", "table:deleted"];
    tableEvents.forEach((ev) => socket.on(ev, refreshTables));
    const poll = setInterval(refreshTables, 15000);

    return () => {
      socket.off("order:new");
      socket.off("order:updated");
      tableEvents.forEach((ev) => socket.off(ev, refreshTables));
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Today's orders plus any still-unpaid order from a previous day, deduped —
  // so a carried-over unpaid commande never disappears from its table/comptoir view.
  const combinedOrders = useMemo(() => {
    const map = new Map<string, StaffOrder>();
    for (const o of orders) map.set(o.id, o);
    for (const o of unpaidCarryover) if (!map.has(o.id)) map.set(o.id, o);
    return [...map.values()];
  }, [orders, unpaidCarryover]);

  const ordersByTable = useMemo(() => {
    const map = new Map<string, StaffOrder[]>();
    for (const o of combinedOrders) {
      const key = o.table ?? "__counter__";
      const list = map.get(key);
      if (list) list.push(o);
      else map.set(key, [o]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.payment.status !== b.payment.status) return a.payment.status === "pending" ? -1 : 1;
        return a.createdAt < b.createdAt ? 1 : -1;
      });
    }
    return map;
  }, [combinedOrders]);

  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null;
  const tableOrders = selectedTable ? ordersByTable.get(selectedTable.label) ?? [] : [];
  const counterOrders = ordersByTable.get("__counter__") ?? [];

  const matchesFilter = (o: StaffOrder) => {
    if (paymentFilter === "cancelled") return o.status === "cancelled";
    if (paymentFilter === "paid") return o.payment.status === "paid" && o.status !== "cancelled";
    return o.payment.status === "pending" && o.status !== "cancelled";
  };
  const filteredTableOrders = tableOrders.filter(matchesFilter);
  const filteredCounterOrders = counterOrders.filter(matchesFilter);

  async function handleMarkPaid(id: string) {
    if (!token) return;
    setPayingId(id);
    try {
      const updated = await markOrderPaid(token, id);
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      setUnpaidCarryover((prev) => prev.filter((o) => o.id !== id));
      setDetailOrder(updated);
      refreshTables();
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
      setDetailOrder(updated);
      refreshTables();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'annulation.");
    } finally {
      setCancellingId(null);
    }
  }

  const drilledIn = !!selectedTable || showCounter;

  return (
    <div className="min-h-screen">
      <TopBar />
      {error && <div className="mx-5 mt-3 rounded-xl bg-red-soft px-4 py-2.5 text-sm text-red">{error}</div>}

      <div className="grid grid-cols-3 gap-3 px-5 pt-4">
        <Stat label="Commandes aujourd'hui" value={String(stats.count)} />
        <Stat label="Encaissé" value={`${stats.revenue} DA`} />
        <Stat label="En attente de paiement" value={String(stats.pending)} />
      </div>

      {!drilledIn && (
        <>
          <div className="flex items-center justify-between gap-3 px-5 pt-4">
            <div className="font-display text-2xl">Tables</div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <button
              onClick={() => setShowCounter(true)}
              className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-green bg-green-soft p-4 text-center transition-colors motion-safe:active:scale-[0.97]"
            >
              <div className="font-display text-2xl text-green">COMPTOIR</div>
              <div className="text-xs text-muted">À emporter, sans table</div>
              {counterOrders.filter((o) => o.status !== "cancelled" && o.payment.status === "pending").length > 0 && (
                <div className="text-xs font-semibold text-green">
                  {counterOrders.filter((o) => o.status !== "cancelled" && o.payment.status === "pending").length} en attente
                </div>
              )}
            </button>
            {tables.map((t) => {
              const pending = (ordersByTable.get(t.label) ?? []).filter(
                (o) => o.status !== "cancelled" && o.payment.status === "pending"
              );
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTableId(t.id)}
                  className={`flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 text-center transition-colors motion-safe:active:scale-[0.97] ${TABLE_STATUS_COLOR[t.status]}`}
                >
                  <div className="font-display text-3xl leading-none">{t.label}</div>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
                    <span className={`h-2 w-2 rounded-full ${TABLE_STATUS_DOT[t.status]}`} />
                    {TABLE_STATUS_LABEL[t.status]}
                  </div>
                  {pending.length > 0 && (
                    <div className="text-xs font-semibold text-orange">{pending.length} commande(s)</div>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {selectedTable && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
            <div>
              <button
                onClick={() => setSelectedTableId(null)}
                className={`${btnGhost} mb-2 flex items-center gap-1.5`}
              >
                ← Tables
              </button>
              <div className="flex items-center gap-2.5">
                <div className="font-display text-3xl leading-none">Table {selectedTable.label}</div>
                <span className="flex items-center gap-1.5 rounded-full bg-panel px-2.5 py-1 text-[11px] font-medium text-muted">
                  <span className={`h-2 w-2 rounded-full ${TABLE_STATUS_DOT[selectedTable.status]}`} />
                  {TABLE_STATUS_LABEL[selectedTable.status]}
                </span>
              </div>
            </div>
            {selectedTable.status === "free" ? (
              <button
                onClick={() =>
                  router.push(`/cashier/new?tableSlug=${selectedTable.qrSlug}&tableLabel=${encodeURIComponent(selectedTable.label)}`)
                }
                className="rounded-xl bg-green px-6 py-3.5 font-display text-lg tracking-wide text-[#08130a] transition-colors motion-safe:active:scale-95 hover:bg-green-hover"
              >
                + Nouvelle commande
              </button>
            ) : (
              <div className="max-w-[280px] rounded-xl bg-orange-soft px-4 py-2.5 text-xs font-medium text-orange">
                Table occupée — libérez-la avant de créer une nouvelle commande.
              </div>
            )}
          </div>

          <div className="pt-4">
            <PaymentFilterBar value={paymentFilter} onChange={setPaymentFilter} />
          </div>

          {filteredTableOrders.length === 0 ? (
            <div className="mx-5 mt-5 rounded-2xl border border-dashed border-border py-14 text-center text-muted">
              Aucune commande {paymentFilter === "paid" ? "payée" : paymentFilter === "cancelled" ? "annulée" : "non payée"} pour cette table aujourd&apos;hui.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredTableOrders.map((order) => (
                <OrderTile key={order.id} order={order} onClick={() => setDetailOrder(order)} />
              ))}
            </div>
          )}
        </>
      )}

      {showCounter && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
            <div>
              <button
                onClick={() => setShowCounter(false)}
                className={`${btnGhost} mb-2 flex items-center gap-1.5`}
              >
                ← Tables
              </button>
              <div className="font-display text-3xl leading-none">Comptoir / à emporter</div>
            </div>
            <button
              onClick={() => router.push("/cashier/new?counter=1")}
              className="rounded-xl bg-green px-6 py-3.5 font-display text-lg tracking-wide text-[#08130a] transition-colors motion-safe:active:scale-95 hover:bg-green-hover"
            >
              + Nouvelle commande
            </button>
          </div>

          <div className="pt-4">
            <PaymentFilterBar value={paymentFilter} onChange={setPaymentFilter} />
          </div>

          {filteredCounterOrders.length === 0 ? (
            <div className="mx-5 mt-5 rounded-2xl border border-dashed border-border py-14 text-center text-muted">
              Aucune commande {paymentFilter === "paid" ? "payée" : paymentFilter === "cancelled" ? "annulée" : "non payée"} au comptoir aujourd&apos;hui.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredCounterOrders.map((order) => (
                <OrderTile key={order.id} order={order} onClick={() => setDetailOrder(order)} />
              ))}
            </div>
          )}
        </>
      )}

      {detailOrder && (
        <Modal title={`Commande #${detailOrder.orderNumber}`} onClose={() => setDetailOrder(null)}>
          <div className="flex flex-wrap gap-1.5">
            {detailOrder.table ? (
              <span className="rounded-full bg-green-soft px-2.5 py-1 text-xs font-semibold text-green">
                Table {detailOrder.table}
              </span>
            ) : (
              <span className="rounded-full bg-panel-2 px-2.5 py-1 text-xs text-muted">Comptoir</span>
            )}
            {detailOrder.source === "counter" && (
              <span className="rounded-full bg-orange-soft px-2.5 py-1 text-xs font-semibold text-orange">CAISSE</span>
            )}
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[detailOrder.status]}`}>
              {STATUS_LABEL[detailOrder.status] || detailOrder.status}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {detailOrder.items.map((it, idx) => (
              <div key={idx} className="flex items-start justify-between text-sm">
                <div>
                  <span className="font-medium">
                    {it.qty}× {it.name} <span className="text-muted">({it.sizeLabel})</span>
                  </span>
                  {it.supplements.length > 0 && <div className="text-xs text-muted">+ {it.supplements.join(", ")}</div>}
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

          <div className="flex items-center justify-between border-t border-border pt-3.5">
            <span className="text-sm text-muted">Total</span>
            <span className="font-display text-2xl text-green">{detailOrder.total} DA</span>
          </div>

          <div className="text-xs text-muted">
            {detailOrder.payment.status === "paid" && detailOrder.payment.paidAt
              ? `Encaissée à ${new Date(detailOrder.payment.paidAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
              : "Paiement en attente"}
            {detailOrder.customerPhone ? ` · ${detailOrder.customerPhone}` : ""}
          </div>

          <div className="flex flex-wrap gap-2">
            {detailOrder.status === "new" && detailOrder.payment.status === "pending" && (
              <button
                onClick={() => router.push(`/cashier/new?editOrderId=${detailOrder.id}`)}
                className="h-11 flex-1 rounded-xl border border-border text-sm text-muted transition-colors motion-safe:active:scale-95 hover:border-green hover:text-fg"
              >
                Modifier
              </button>
            )}
            <button
              onClick={() => handlePrint(detailOrder.id)}
              disabled={printingId === detailOrder.id}
              className="h-11 flex-1 rounded-xl border border-border text-sm text-muted transition-colors motion-safe:active:scale-95 hover:border-green hover:text-fg disabled:opacity-60"
            >
              {printingId === detailOrder.id ? "…" : printedIds.has(detailOrder.id) ? "Réimprimer reçu" : "Imprimer reçu"}
            </button>
          </div>

          <div className="flex gap-2">
            {(detailOrder.status === "new" || detailOrder.status === "in_progress") && (
              <button
                onClick={() => handleCancel(detailOrder)}
                disabled={cancellingId === detailOrder.id}
                className="h-12 flex-1 rounded-xl border border-red text-sm font-medium text-red transition-colors motion-safe:active:scale-95 hover:bg-red-soft disabled:opacity-60"
              >
                {cancellingId === detailOrder.id ? "…" : "Annuler la commande"}
              </button>
            )}
            {detailOrder.payment.status === "paid" ? (
              <span className="flex h-12 flex-[2] items-center justify-center rounded-xl bg-green-soft text-sm font-semibold text-green">
                PAYÉ
              </span>
            ) : detailOrder.status !== "cancelled" && detailOrder.payment.method !== "cash" ? (
              <button
                onClick={() => handleMarkPaid(detailOrder.id)}
                disabled={payingId === detailOrder.id}
                className="h-12 flex-[2] rounded-xl bg-green font-display text-lg tracking-wide text-[#08130a] transition-colors motion-safe:active:scale-[0.97] hover:bg-green-hover disabled:opacity-60"
              >
                {payingId === detailOrder.id ? "…" : `Encaisser — ${detailOrder.total} DA`}
              </button>
            ) : null}
          </div>

          {detailOrder.payment.status === "pending" &&
            detailOrder.status !== "cancelled" &&
            detailOrder.payment.method === "cash" &&
            (() => {
              const givenNum = Number(cashGiven);
              const hasGiven = cashGiven.trim() !== "" && !Number.isNaN(givenNum);
              const change = hasGiven ? givenNum - detailOrder.total : 0;
              const insufficient = hasGiven && change < 0;
              const canConfirm = hasGiven && change >= 0;
              return (
                <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-panel p-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted">Montant reçu</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      autoFocus
                      value={cashGiven}
                      onChange={(e) => setCashGiven(e.target.value)}
                      placeholder={`${detailOrder.total} DA`}
                      className={inputCls}
                    />
                  </label>
                  {insufficient && (
                    <div className="rounded-xl bg-red-soft px-3 py-2 text-sm font-medium text-red">
                      Insuffisant — il manque {Math.abs(change)} DA
                    </div>
                  )}
                  {hasGiven && change === 0 && (
                    <div className="rounded-xl bg-green-soft px-3 py-2 text-sm font-medium text-green">Montant exact</div>
                  )}
                  {hasGiven && change > 0 && (
                    <div className="rounded-xl bg-green-soft px-3 py-2 text-sm font-medium text-green">
                      Monnaie à rendre : {change} DA
                    </div>
                  )}
                  <button
                    onClick={() => handleMarkPaid(detailOrder.id)}
                    disabled={!canConfirm || payingId === detailOrder.id}
                    className="h-12 rounded-xl bg-green font-display text-lg tracking-wide text-[#08130a] transition-colors motion-safe:active:scale-[0.97] hover:bg-green-hover disabled:opacity-50"
                  >
                    {payingId === detailOrder.id ? "…" : `Encaisser — ${detailOrder.total} DA`}
                  </button>
                </div>
              );
            })()}
        </Modal>
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
