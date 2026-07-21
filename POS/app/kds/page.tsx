"use client";

import { useEffect, useMemo, useState } from "react";
import RoleGate from "@/components/RoleGate";
import TopBar from "@/components/TopBar";
import TicketCard from "@/components/TicketCard";
import { useAuth } from "@/lib/auth-context";
import { getActiveOrders, updateOrderStatus } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { playBeep } from "@/lib/beep";
import { OrderStatus, StaffOrder } from "@/lib/types";

function KdsBoard() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [station, setStation] = useState<string>("all");
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!token) return;

    getActiveOrders(token)
      .then(setOrders)
      .catch(() => setError("Impossible de charger les commandes."));

    const socket = getSocket(token);

    socket.on("order:new", (order: StaffOrder) => {
      setOrders((prev) => [...prev, order]);
      setFreshIds((prev) => new Set(prev).add(order.id));
      playBeep();
      setTimeout(() => {
        setFreshIds((prev) => {
          const next = new Set(prev);
          next.delete(order.id);
          return next;
        });
      }, 4000);
    });

    socket.on("order:updated", (order: StaffOrder) => {
      setOrders((prev) => {
        if (order.status === "completed" || order.status === "cancelled") {
          return prev.filter((o) => o.id !== order.id);
        }
        const exists = prev.some((o) => o.id === order.id);
        if (!exists) return prev;
        return prev.map((o) => (o.id === order.id ? order : o));
      });
    });

    return () => {
      socket.off("order:new");
      socket.off("order:updated");
    };
  }, [token]);

  const stations = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => o.items.forEach((it) => set.add(it.station)));
    return ["all", ...Array.from(set).sort()];
  }, [orders]);

  const visible = useMemo(() => {
    const filtered =
      station === "all" ? orders : orders.filter((o) => o.items.some((it) => it.station === station));
    return [...filtered].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders, station]);

  async function handleAdvance(id: string, status: OrderStatus) {
    if (!token) return;
    try {
      const updated = await updateOrderStatus(token, id, status);
      setOrders((prev) => {
        if (updated.status === "completed" || updated.status === "cancelled") {
          return prev.filter((o) => o.id !== id);
        }
        return prev.map((o) => (o.id === id ? updated : o));
      });
    } catch {
      setError("Échec de la mise à jour du statut.");
    }
  }

  return (
    <div className="min-h-screen">
      <TopBar />
      <div className="flex items-center gap-2 px-5 pt-4">
        {stations.map((s) => (
          <button
            key={s}
            onClick={() => setStation(s)}
            className={`rounded-full px-5 py-3 text-sm font-medium capitalize transition-colors motion-safe:active:scale-95 ${
              station === s ? "bg-green text-[#08130a]" : "bg-panel text-muted hover:text-fg"
            }`}
          >
            {s === "all" ? "Toutes" : s}
          </button>
        ))}
      </div>

      {error && <div className="mx-5 mt-3 text-sm text-red">{error}</div>}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted">
          <div className="font-display text-2xl">AUCUNE COMMANDE</div>
          <div className="text-sm">Les nouvelles commandes apparaîtront ici en temps réel.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((order) => (
            <TicketCard
              key={order.id}
              order={order}
              now={now}
              isFresh={freshIds.has(order.id)}
              onAdvance={handleAdvance}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function KdsPage() {
  return (
    <RoleGate allow={["kitchen", "manager"]}>
      <KdsBoard />
    </RoleGate>
  );
}
