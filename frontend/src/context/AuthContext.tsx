import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "../lib/api";
import type { LoginResponse, Role, User } from "../types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name?: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("sutra_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("sutra_token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("sutra_token", res.access_token);
    setUser(res.user);
  }

  async function register(email: string, password: string, full_name?: string) {
    await api<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    });
    await login(email, password);
  }

  function logout() {
    localStorage.removeItem("sutra_token");
    setUser(null);
  }

  function hasRole(...roles: Role[]) {
    if (!user) return false;
    return roles.includes(user.role);
  }

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, hasRole }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
