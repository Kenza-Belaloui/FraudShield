import React, { createContext, useContext, useEffect, useState } from "react";
import { login as apiLogin, me as apiMe } from "../api/auth";

type User = { nom?: string; prenom?: string; email?: string };

type AuthCtx = {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("access_token"));
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function loadMe() {
      if (!token) {
        setUser(null);
        return;
      }
      try {
        const u = await apiMe();
        setUser(u);
      } catch {
        // si pas /auth/me, fallback
        setUser({ nom: "Admin", prenom: "" });
      }
    }
    loadMe();
  }, [token]);

  async function login(email: string, password: string) {
    const res = await apiLogin({ email, password });
    localStorage.setItem("access_token", res.access_token);
    setToken(res.access_token);

    // charger user
    try {
      const u = await apiMe();
      setUser(u);
    } catch {
      setUser({ nom: "Admin", prenom: "" });
    }
  }

  function logout() {
    localStorage.removeItem("access_token");
    setToken(null);
    setUser(null);
  }

  return <Ctx.Provider value={{ token, user, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}