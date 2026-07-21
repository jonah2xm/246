"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { defaultRouteForRole } from "@/components/RoleGate";

export default function Home() {
  const { staff, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    router.replace(staff ? defaultRouteForRole(staff.role) : "/login");
  }, [ready, staff, router]);

  return <div className="flex min-h-screen items-center justify-center text-muted">Chargement…</div>;
}
