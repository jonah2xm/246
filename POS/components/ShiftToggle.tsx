"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getMyShift, clockIn, clockOut } from "@/lib/api";
import { Shift } from "@/lib/types";

export default function ShiftToggle() {
  const { token } = useAuth();
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token) return;
    getMyShift(token)
      .then(setShift)
      .finally(() => setReady(true));
  }, [token]);

  async function toggle() {
    if (!token) return;
    setLoading(true);
    try {
      if (shift) {
        await clockOut(token);
        setShift(null);
      } else {
        const s = await clockIn(token);
        setShift(s);
      }
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return null;

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
        shift ? "bg-green-soft text-green" : "border border-border text-muted hover:text-fg"
      }`}
    >
      {shift ? "● En service" : "Pointer l'arrivée"}
    </button>
  );
}
