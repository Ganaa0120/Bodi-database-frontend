'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser, ApiErrorBody } from '@/lib/types';

interface AuthContextValue {
  user: AuthUser | null;
  /** Эхний silent-refresh шалгалт дуусаагүй байгаа эсэх (app эхлэхэд) */
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Backend API руу Authorization header-тэйгээр хүсэлт явуулах helper.
   * Access token хугацаа дууссан (401 + TOKEN_EXPIRED) үед нэг удаа
   * автоматаар silent refresh хийж, дахин оролдоно.
   */
  authorizedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export class LoginError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'LoginError';
    this.status = status;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  // Access token-ийг React state-д биш, ref-д хадгална — учир нь
  // authorizedFetch дотор хамгийн сүүлийн утгыг closure-гүйгээр шууд
  // унших шаардлагатай (re-render хүлээхгүйгээр).
  const accessTokenRef = useRef<string | null>(null);

  const silentRefresh = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      if (!res.ok) {
        accessTokenRef.current = null;
        setUser(null);
        return false;
      }
      const data = await res.json();
      accessTokenRef.current = data.accessToken;
      setUser(data.user);
      return true;
    } catch {
      accessTokenRef.current = null;
      setUser(null);
      return false;
    }
  }, []);

  useEffect(() => {
    silentRefresh().finally(() => setIsInitializing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      const body = data as ApiErrorBody;
      throw new LoginError(body.error || 'Нэвтрэхэд алдаа гарлаа.', res.status);
    }

    accessTokenRef.current = data.accessToken;
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: accessTokenRef.current ? { Authorization: `Bearer ${accessTokenRef.current}` } : {},
      });
    } finally {
      accessTokenRef.current = null;
      setUser(null);
    }
  }, []);

  const authorizedFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
      const doFetch = () =>
        fetch(input, {
          ...init,
          headers: {
            ...init.headers,
            ...(accessTokenRef.current ? { Authorization: `Bearer ${accessTokenRef.current}` } : {}),
          },
        });

      let res = await doFetch();

      if (res.status === 401) {
        const body = (await res.clone().json().catch(() => null)) as ApiErrorBody | null;
        if (body && 'code' in body && (body as { code?: string }).code === 'TOKEN_EXPIRED') {
          const refreshed = await silentRefresh();
          if (refreshed) {
            res = await doFetch();
          }
        }
      }

      return res;
    },
    [silentRefresh]
  );

  return (
    <AuthContext.Provider value={{ user, isInitializing, login, logout, authorizedFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() нь <AuthProvider> дотор л ашиглагдана.');
  }
  return ctx;
}
