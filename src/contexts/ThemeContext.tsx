'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ThemeMode } from '@/lib/types';

const STORAGE_KEY = 'bodi-theme';

interface ThemeContextValue {
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Server/эхний client render хоёул 'dark' байх ёстой (hydration mismatch-аас
  // сэргийлэх) — хэрэглэгчийн өмнөх сонголтыг зөвхөн mount хийсний ДАРАА
  // localStorage-с уншиж, шаардлагатай бол шинэчилнэ.
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      setThemeModeState(stored);
    }
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    window.localStorage.setItem(STORAGE_KEY, mode);
  };

  const toggleTheme = () => setThemeMode(themeMode === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme, setThemeMode }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme() нь <ThemeProvider> дотор л ашиглагдана.');
  }
  return ctx;
}