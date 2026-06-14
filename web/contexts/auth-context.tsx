"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { auth, ensureCsrf, User } from "@/lib/api";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  loginEmail: (email: string, password: string) => Promise<User>;
  signupEmail: (email: string, password: string, name: string) => Promise<User>;
  loginFacebook: (accessToken: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const me = await auth.me();
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    // Ensure CSRF cookie is set before any mutations, then check session.
    ensureCsrf().then(() => refreshUser()).finally(() => setLoading(false));
  }, [refreshUser]);

  // All auth methods return User so callers can navigate immediately.
  async function handleAuth(fn: () => Promise<User | unknown>, forceRefresh = false): Promise<User> {
    const result = await fn();
    if (!forceRefresh) {
      const maybeUser = result as Partial<User>;
      if (maybeUser?.email) {
        setUser(maybeUser as User);
        return maybeUser as User;
      }
    }
    const me = await refreshUser();
    if (!me) throw new Error("Authenticated but could not load user profile.");
    return me;
  }

  const value: AuthCtx = {
    user, loading,
    loginEmail: (e, p) => handleAuth(() => auth.loginEmail(e, p)),
    signupEmail: (e, p, n) => handleAuth(() => auth.signupEmail(e, p, n), true),
    loginFacebook: (t) => handleAuth(() => auth.loginFacebook(t)),
    logout: async () => {
      await auth.logout();
      setUser(null);
    },
    refreshUser,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
