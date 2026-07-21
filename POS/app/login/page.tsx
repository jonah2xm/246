"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { defaultRouteForRole } from "@/components/RoleGate";

export default function LoginPage() {
  const { staff, ready, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && staff) router.replace(defaultRouteForRole(staff.role));
  }, [ready, staff, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <div className="font-display text-[40px] tracking-wide">
        64<span className="text-green">.</span>PIZZA <span className="text-muted text-lg">POS</span>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-[320px] flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted">Identifiant</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            className="rounded-xl border border-border bg-panel px-4 py-3 text-sm outline-none focus:border-green"
            placeholder="kitchen / cashier / manager"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted">Mot de passe</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="rounded-xl border border-border bg-panel px-4 py-3 text-sm outline-none focus:border-green"
          />
        </div>

        {error && <div className="text-[13px] text-red">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-2xl bg-green py-3.5 font-display text-lg tracking-wide text-[#08130a] disabled:opacity-60"
        >
          {submitting ? "…" : "CONNEXION"}
        </button>
      </form>
    </div>
  );
}
