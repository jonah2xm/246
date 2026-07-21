"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Staff } from "./types";
import { login as apiLogin } from "./api";
import { disconnectSocket } from "./socket";

interface AuthContextValue {
  staff: Staff | null;
  token: string | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "pos_auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setStaff(parsed.staff);
        setToken(parsed.token);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setReady(true);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await apiLogin(username, password);
    setStaff(result.staff);
    setToken(result.token);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  }, []);

  const logout = useCallback(() => {
    setStaff(null);
    setToken(null);
    window.localStorage.removeItem(STORAGE_KEY);
    disconnectSocket();
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ staff, token, ready, login, logout }),
    [staff, token, ready, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
