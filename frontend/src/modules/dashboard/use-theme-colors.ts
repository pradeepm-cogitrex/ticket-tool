import { useEffect, useState } from 'react';
import { useTheme } from '@/shared/context/theme-context';

const read = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const readAll = () => ({
  accent: read('--accent'),
  mint: read('--mint'),
  amber: read('--amber'),
  muted: read('--muted'),
  faint: read('--faint'),
  line: read('--line'),
  surface: read('--surface'),
  fg: read('--fg'),
  info: read('--info'),
  danger: read('--danger'),
});

/** Resolved token colours for chart SVGs (SVG attributes cannot use CSS variables reliably). */
export function useThemeColors() {
  const { theme } = useTheme();
  const [colors, setColors] = useState(readAll);

  // re-read on the next frame, after the new data-theme attribute is applied
  useEffect(() => {
    const frame = requestAnimationFrame(() => setColors(readAll()));
    return () => cancelAnimationFrame(frame);
  }, [theme]);

  return colors;
}
