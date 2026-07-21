"use client";

import { useEffect, useState } from "react";
import RoleGate from "@/components/RoleGate";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/lib/auth-context";
import { getAnalyticsSummary, getFeedbackList } from "@/lib/api";
import { AnalyticsSummary, FeedbackEntry } from "@/lib/types";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 font-display text-2xl text-green">{value}</div>
    </div>
  );
}

function Dashboard() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([getAnalyticsSummary(token), getFeedbackList(token)])
      .then(([s, f]) => {
        setSummary(s);
        setFeedback(f);
      })
      .catch(() => setError("Impossible de charger les statistiques."));
  }, [token]);

  if (error) return <div className="p-5 text-sm text-red">{error}</div>;
  if (!summary) return <div className="p-5 text-muted">Chargement…</div>;

  const avgRating = feedback.length
    ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1)
    : "—";

  return (
    <div className="flex flex-col gap-6 p-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Commandes" value={String(summary.orderCount)} />
        <Stat label="Chiffre d'affaires" value={`${summary.revenue} DA`} />
        <Stat label="Panier moyen" value={`${summary.averageOrderValue} DA`} />
        <Stat
          label="Heure de pointe"
          value={summary.peakHour ? `${summary.peakHour.hour}h` : "—"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-panel p-4">
          <div className="mb-3 font-display text-lg text-green">Ventes par article</div>
          <div className="flex flex-col gap-1.5">
            {summary.salesByItem.length === 0 && <div className="text-sm text-muted">Aucune vente.</div>}
            {summary.salesByItem.slice(0, 12).map((it) => (
              <div key={it.name} className="flex justify-between text-sm">
                <span>
                  {it.qty}× {it.name}
                </span>
                <span className="text-muted">{it.revenue} DA</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4">
          <div className="mb-3 font-display text-lg text-green">Ventes par heure</div>
          <div className="flex flex-col gap-1.5">
            {summary.salesByHour.length === 0 && <div className="text-sm text-muted">Aucune vente.</div>}
            {summary.salesByHour.map((h) => (
              <div key={h.hour} className="flex items-center gap-2 text-sm">
                <span className="w-10 text-muted">{h.hour}h</span>
                <div className="h-2 flex-1 rounded-full bg-panel-2">
                  <div
                    className="h-2 rounded-full bg-green"
                    style={{
                      width: `${Math.min(100, (h.revenue / (summary.peakHour?.revenue || 1)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-16 text-right text-muted">{h.revenue} DA</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4">
          <div className="mb-3 font-display text-lg text-green">Combos populaires</div>
          <div className="flex flex-col gap-1.5">
            {summary.popularCombos.length === 0 && <div className="text-sm text-muted">Aucun combo vendu.</div>}
            {summary.popularCombos.map((c) => (
              <div key={c.name} className="flex justify-between text-sm">
                <span>{c.name}</span>
                <span className="text-muted">{c.qty}×</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4">
          <div className="mb-3 font-display text-lg text-green">Performance équipe</div>
          <div className="flex flex-col gap-1.5">
            {summary.staffPerformance.length === 0 && <div className="text-sm text-muted">Pas de données.</div>}
            {summary.staffPerformance.map((s) => (
              <div key={s.staffId} className="flex justify-between text-sm">
                <span>{s.name}</span>
                <span className="text-muted">
                  {s.ordersCompleted} servies · {s.paymentsHandled} encaissées ({s.revenueCollected} DA)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-display text-lg text-green">Avis clients</div>
            <div className="text-sm text-muted">Moyenne: {avgRating} / 5 ({feedback.length})</div>
          </div>
          <div className="flex flex-col gap-2">
            {feedback.length === 0 && <div className="text-sm text-muted">Aucun avis pour le moment.</div>}
            {feedback.slice(0, 10).map((f) => (
              <div key={f._id} className="flex items-center justify-between text-sm">
                <span>
                  {"★".repeat(f.rating)}
                  {"☆".repeat(5 - f.rating)}{" "}
                  {f.orderId ? `#${f.orderId.orderNumber}` : ""}
                </span>
                <span className="text-muted">{f.comment}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <RoleGate allow={["manager"]}>
      <TopBar />
      <Dashboard />
    </RoleGate>
  );
}
