import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { storageService } from '../services/storage.service';

export type ThemeMode = 'light' | 'dark';

interface ThemeApi {
  theme: ThemeMode;
  toggleTheme: () => void;
}

const THEME_KEY = 'td.theme';
const ThemeContext = createContext<ThemeApi | null>(null);

const initialTheme = (): ThemeMode => {
  const saved = storageService.get(THEME_KEY);
  const theme: ThemeMode =
    saved === 'light' || saved === 'dark' ? saved : window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  // apply before first paint so nothing flashes in the wrong theme
  document.documentElement.dataset.theme = theme;
  return theme;
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    storageService.set(THEME_KEY, theme);
  }, [theme]);

  const api = useMemo<ThemeApi>(
    () => ({ theme, toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }),
    [theme],
  );

  return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeApi {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
