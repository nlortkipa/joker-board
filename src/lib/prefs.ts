import { useSyncExternalStore } from 'react';

export type Theme = 'system' | 'light' | 'dark';
export interface Prefs {
  theme: Theme;
  zoomed: boolean;
}

const KEY = 'joker-board:prefs';
const DEFAULTS: Prefs = { theme: 'system', zoomed: false };

function read(): Prefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return DEFAULTS;
  }
}

let prefs = read();
const listeners = new Set<() => void>();

export function setPrefs(next: Partial<Prefs>) {
  prefs = { ...prefs, ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* private mode — keep in memory */
  }
  applyTheme();
  listeners.forEach((l) => l());
}

export const getPrefs = () => prefs;
export const usePrefs = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => prefs,
  );

export function applyTheme() {
  const root = document.documentElement;
  if (prefs.theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', prefs.theme);
}
