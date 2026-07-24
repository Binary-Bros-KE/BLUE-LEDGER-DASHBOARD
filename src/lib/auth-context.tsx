"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api, TOKEN_STORAGE_KEY } from "./api";
import type { Account } from "./types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  account: Account | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    // Fetch/check-on-mount — the react.dev-endorsed pattern; this rule is stricter than the docs
    // here.
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("unauthenticated");
      return;
    }
    // Re-hydrates "logged in as X" on every load/refresh, and confirms the token is still valid
    // (not expired, account not deactivated) rather than trusting whatever's in localStorage.
    api
      .me()
      .then((acc) => {
        setAccount(acc);
        setStatus("authenticated");
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setStatus("unauthenticated");
      });
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const result = await api.login(email, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
    setAccount(result.account);
    setStatus("authenticated");
  }

  function logout(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAccount(null);
    setStatus("unauthenticated");
  }

  return <AuthContext.Provider value={{ status, account, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
