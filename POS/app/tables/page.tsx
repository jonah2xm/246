"use client";

import { useEffect, useMemo, useState } from "react";
import RoleGate from "@/components/RoleGate";
import TopBar from "@/components/TopBar";
import Modal, { Field, inputCls, btnPrimary, btnGhost } from "@/components/Modal";
import { useAuth } from "@/lib/auth-context";
import { getTables, createTable, updateTable, deleteTable, mergeTables, splitSession, closeSession } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { TableInfo, TableStatus } from "@/lib/types";

const STATUS_LABEL: Record<TableStatus, string> = {
  free: "Libre",
  occupied: "Occupée",
};

const STATUS_COLOR: Record<TableStatus, string> = {
  free: "border-border bg-panel",
  occupied: "border-green bg-green-soft",
};

const STATUS_DOT: Record<TableStatus, string> = {
  free: "bg-muted",
  occupied: "bg-green",
};

function durationSince(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, "0")}`;
}

function FloorPlan() {
  const { token, staff: me } = useAuth();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TableInfo | "new" | null>(null);

  const isManager = me?.role === "manager";

  async function refresh() {
    if (!token) return;
    try {
      setTables(await getTables(token));
    } catch {
      setError("Impossible de charger les tables.");
    }
  }

  useEffect(() => {
    refresh();
    if (!token) return;
    const socket = getSocket(token);
    const events = ["table:updated", "table:closed", "table:merged", "table:split", "table:assigned", "table:deleted"];
    events.forEach((ev) => socket.on(ev, refresh));
    const poll = setInterval(refresh, 15000);
    return () => {
      events.forEach((ev) => socket.off(ev, refresh));
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleMerge() {
    if (!token || selected.size < 2) return;
    try {
      await mergeTables(token, [...selected]);
      setSelected(new Set());
      refresh();
    } catch {
      setError("Échec de la fusion.");
    }
  }

  async function handleDelete(table: TableInfo) {
    if (!token) return;
    if (!confirm(`Supprimer la table "${table.label}" ? Son QR code ne fonctionnera plus.`)) return;
    try {
      await deleteTable(token, table.id);
      setError(null);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la suppression.");
    }
  }

  const stats = useMemo(() => {
    const byStatus = { free: 0, occupied: 0 } as Record<TableStatus, number>;
    tables.forEach((t) => byStatus[t.status]++);
    return byStatus;
  }, [tables]);

  return (
    <div className="min-h-screen">
      <TopBar />

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <div className="flex items-center gap-4 text-xs text-muted">
          {(Object.keys(STATUS_LABEL) as TableStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />
              {STATUS_LABEL[s]} ({stats[s]})
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleMerge}
            disabled={selected.size < 2}
            className="rounded-full bg-green px-5 py-3 text-sm font-semibold text-[#08130a] transition-colors motion-safe:active:scale-95 hover:bg-green-hover disabled:opacity-40"
          >
            Fusionner ({selected.size})
          </button>
          {isManager && (
            <button onClick={() => setEditing("new")} className={btnPrimary}>
              + Nouvelle table
            </button>
          )}
        </div>
      </div>

      {error && <div className="mx-5 mt-3 rounded-xl bg-red-soft px-4 py-2.5 text-sm text-red">{error}</div>}

      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((t) => {
          const merged = (t.session?.tableIds.length ?? 0) > 1;
          return (
            <div key={t.id} className={`flex flex-col gap-3 rounded-2xl border-2 p-4 transition-colors ${STATUS_COLOR[t.status]}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="font-display text-3xl leading-none">{t.label}</div>
                  <span className="text-xs text-muted">{t.capacity} places</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isManager && (
                    <>
                      <button
                        onClick={() => setEditing(t)}
                        aria-label="Modifier la table"
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-sm text-muted transition-colors motion-safe:active:scale-90 hover:bg-panel-2 hover:text-fg"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        aria-label="Supprimer la table"
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-sm text-muted transition-colors motion-safe:active:scale-90 hover:bg-red-soft hover:text-red"
                      >
                        🗑
                      </button>
                    </>
                  )}
                  <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-panel-2" title="Sélectionner pour fusion">
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                      className="h-5 w-5 accent-green"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[t.status]}`} />
                {STATUS_LABEL[t.status]}
              </div>

              {t.session && (
                <div className="flex flex-col gap-2 border-t border-border pt-3 text-xs text-muted">
                  <div>Ouverte depuis {durationSince(t.session.openedAt)}</div>
                  {merged && <div className="text-green">Fusionnée ({t.session.tableIds.length} tables)</div>}
                  <div className="flex gap-2">
                    {merged && (
                      <button
                        onClick={() => t.session && splitSession(token!, t.session.id).then(refresh)}
                        className="h-11 flex-1 rounded-xl border border-border text-sm text-muted transition-colors motion-safe:active:scale-95 hover:border-green hover:text-fg"
                      >
                        Séparer
                      </button>
                    )}
                    <button
                      onClick={() => t.session && closeSession(token!, t.session.id).then(refresh)}
                      className="h-11 flex-1 rounded-xl border border-border text-sm text-muted transition-colors motion-safe:active:scale-95 hover:border-green hover:text-fg"
                    >
                      Clôturer
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-5 pb-5 text-[11px] text-muted">
        Une table passe automatiquement en «Occupée» dès qu&apos;une commande y est passée, et redevient «Libre» quand
        toutes ses commandes sont encaissées.
      </div>

      {editing && (
        <TableFormModal
          table={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

function TableFormModal({
  table,
  onClose,
  onSaved,
  onError,
}: {
  table: TableInfo | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (e: string | null) => void;
}) {
  const { token } = useAuth();
  const [label, setLabel] = useState(table?.label || "");
  const [capacity, setCapacity] = useState(table?.capacity ?? 4);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!token || !label.trim()) return;
    setSaving(true);
    try {
      if (table) {
        await updateTable(token, table.id, { label: label.trim(), capacity });
      } else {
        await createTable(token, { label: label.trim(), capacity });
      }
      onError(null);
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={table ? `Modifier — ${table.label}` : "Nouvelle table"} onClose={onClose}>
      <Field label="Nom de la table">
        <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} placeholder="T7" autoFocus />
      </Field>
      <Field label="Nombre de places">
        <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className={inputCls} />
      </Field>
      {table && (
        <div className="rounded-xl bg-panel px-4 py-3 text-xs text-muted">
          QR: <span className="text-fg">?table={table.qrSlug}</span> — le lien reste identique après modification.
        </div>
      )}
      {!table && (
        <div className="rounded-xl bg-panel px-4 py-3 text-xs text-muted">
          Un QR unique sera généré — son lien s&apos;affichera sur la carte de la table.
        </div>
      )}
      <div className="flex justify-end gap-2.5">
        <button onClick={onClose} className={btnGhost}>
          Annuler
        </button>
        <button onClick={handleSave} disabled={saving || !label.trim()} className={btnPrimary}>
          {saving ? "…" : "Enregistrer"}
        </button>
      </div>
    </Modal>
  );
}

export default function TablesPage() {
  return (
    <RoleGate allow={["cashier", "manager"]}>
      <FloorPlan />
    </RoleGate>
  );
}
