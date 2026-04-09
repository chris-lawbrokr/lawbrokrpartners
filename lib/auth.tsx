"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setTokenGetter } from "./api";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  website: string;
}

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_COOKIE_DAYS = 7;

function setCookie(name: string, value: string, days: number): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/`;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1] ?? "") : null;
}

function decodeJwtExp(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload)) as { exp?: number };
    return decoded.exp ?? null;
  } catch {
    return null;
  }
}

const MAX_REFRESH_RETRIES = 3;
const REFRESH_RETRY_INTERVAL_MS = 10_000;
const REFRESH_BUFFER_MS = 60_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const accessTokenRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Hydrate user from cookie after mount to avoid SSR/client mismatch
  useEffect(() => {
    const stored = getCookie("session_user");
    if (!stored) return;
    try {
      setUser(JSON.parse(stored) as User);
    } catch {
      // ignore
    }
  }, []);

  // Wire up the token getter for apiFetch
  useEffect(() => {
    setTokenGetter(() => accessTokenRef.current);
  }, []);

  const clearAuth = useCallback(() => {
    accessTokenRef.current = null;
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    setUser(null);
    deleteCookie("session");
    deleteCookie("session_user");
  }, []);

  const scheduleRefresh = useCallback(
    (token: string) => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      const exp = decodeJwtExp(token);
      if (!exp) return;

      const msUntilExpiry = exp * 1000 - Date.now();
      const refreshIn = Math.max(msUntilExpiry - REFRESH_BUFFER_MS, 0);

      refreshTimerRef.current = setTimeout(() => {
        void refreshToken(0);
      }, refreshIn);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const refreshToken = useCallback(
    async (retryCount: number): Promise<void> => {
      try {
        const res = await apiFetch("/api/auth/refresh", { method: "POST" });

        if (!res.ok) {
          throw new Error("Refresh failed");
        }

        const data = (await res.json()) as {
          access_token: string;
          user: User;
        };
        accessTokenRef.current = data.access_token;
        setUser(data.user);
        setCookie("session", "1", SESSION_COOKIE_DAYS);
        setCookie(
          "session_user",
          JSON.stringify(data.user),
          SESSION_COOKIE_DAYS,
        );
        scheduleRefresh(data.access_token);
      } catch {
        if (retryCount < MAX_REFRESH_RETRIES) {
          refreshTimerRef.current = setTimeout(() => {
            void refreshToken(retryCount + 1);
          }, REFRESH_RETRY_INTERVAL_MS);
        } else {
          clearAuth();
          router.push("/login");
        }
      }
    },
    [clearAuth, router, scheduleRefresh],
  );

  // On mount, attempt a token refresh if we have a session cookie
  useEffect(() => {
    const hasSession = getCookie("session");
    if (hasSession) {
      void refreshToken(0);
    }
  }, [refreshToken]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(errorData?.message ?? "Invalid credentials");
      }

      const data = (await res.json()) as { access_token: string; user: User };
      accessTokenRef.current = data.access_token;
      setUser(data.user);
      setCookie("session", "1", SESSION_COOKIE_DAYS);
      setCookie("session_user", JSON.stringify(data.user), SESSION_COOKIE_DAYS);
      scheduleRefresh(data.access_token);
      router.push("/");
    },
    [router, scheduleRefresh],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Best-effort logout
    }
    clearAuth();
    router.push("/login");
  }, [clearAuth, router]);

  const value: AuthContextValue = { user, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
