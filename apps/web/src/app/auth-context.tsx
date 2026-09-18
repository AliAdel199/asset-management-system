"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  apiBaseUrl,
  apiFetch,
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from "./api-client";

export type AuthUser = {
  id: string;
  fullName: string;
  username: string;
  organizationUnitId: string;
  permissions: string[];
  hasFullAccess: boolean;
};

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (code: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() =>
    getStoredToken() ? "loading" : "unauthenticated",
  );

  useEffect(() => {
    let ignore = false;
    const token = getStoredToken();

    if (!token) {
      return;
    }

    apiFetch("/auth/me")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("unauthenticated");
        }

        return response.json() as Promise<AuthUser>;
      })
      .then((profile) => {
        if (!ignore) {
          setUser(profile);
          setStatus("authenticated");
        }
      })
      .catch(() => {
        if (!ignore) {
          clearStoredToken();
          setUser(null);
          setStatus("unauthenticated");
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await fetch(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(error.message ?? "تعذر تسجيل الدخول.");
    }

    const data = (await response.json()) as {
      accessToken: string;
      user: AuthUser;
    };

    setStoredToken(data.accessToken);
    setUser(data.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
    setStatus("unauthenticated");
    router.push("/login");
  }, [router]);

  const hasPermission = useCallback(
    (code: string) => Boolean(user?.hasFullAccess || user?.permissions.includes(code)),
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, status, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
