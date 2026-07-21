"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Role } from "@/lib/types";

export function defaultRouteForRole(role: Role): string {
  if (role === "cashier") return "/cashier";
  return "/kds"; // kitchen and manager land on KDS by default
}

export default function RoleGate({
  allow,
  children,
}: {
  allow: Role[];
  children: React.ReactNode;
}) {
  const { staff, ready, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!staff || !token) {
      router.replace("/login");
      return;
    }
    if (!allow.includes(staff.role)) {
      router.replace(defaultRouteForRole(staff.role));
    }
  }, [ready, staff, token, allow, router]);

  if (!ready || !staff || !allow.includes(staff.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">Chargement…</div>
    );
  }

  return <>{children}</>;
}
