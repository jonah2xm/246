"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Role } from "@/lib/types";
import ShiftToggle from "./ShiftToggle";

const ROLE_LABEL: Record<Role, string> = {
  kitchen: "Cuisine",
  cashier: "Caisse",
  manager: "Manager",
};

const NAV: { href: string; label: string; roles: Role[] }[] = [
  { href: "/kds", label: "Cuisine", roles: ["kitchen", "manager"] },
  { href: "/cashier", label: "Caisse", roles: ["cashier", "manager"] },
  { href: "/tables", label: "Tables", roles: ["cashier", "manager"] },
  { href: "/qrcodes", label: "QR codes", roles: ["cashier", "manager"] },
  { href: "/admin", label: "Menu", roles: ["manager"] },
  { href: "/analytics", label: "Analytique", roles: ["manager"] },
];

export default function TopBar() {
  const { staff, logout } = useAuth();
  const pathname = usePathname();
  if (!staff) return null;

  const links = NAV.filter((n) => n.roles.includes(staff.role));

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-panel/95 px-5 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-6">
        <div className="font-display text-[22px] tracking-wide">
          64<span className="text-green">.</span>PIZZA <span className="text-muted text-sm">POS</span>
        </div>
        <nav className="flex items-center gap-1">
          {links.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                pathname === n.href
                  ? "bg-green text-[#08130a] font-semibold"
                  : "text-muted hover:text-fg"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <ShiftToggle />
        <span className="text-muted">
          {staff.name} · <span className="text-green">{ROLE_LABEL[staff.role]}</span>
        </span>
        <button
          onClick={logout}
          className="rounded-full border border-border px-3.5 py-1.5 text-xs text-muted hover:text-fg"
        >
          Déconnexion
        </button>
      </div>
    </div>
  );
}
