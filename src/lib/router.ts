import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'leaderboard' }
  | { name: 'games' }
  | { name: 'game'; id: string }
  | { name: 'players' };

function parse(hash: string): Route {
  const [, a, b] = hash.replace(/^#/, '').split('/');
  if (a === 'games' && b) return { name: 'game', id: b };
  if (a === 'games') return { name: 'games' };
  if (a === 'players') return { name: 'players' };
  return { name: 'leaderboard' };
}

let current = parse(location.hash);
const listeners = new Set<() => void>();
window.addEventListener('hashchange', () => {
  current = parse(location.hash);
  listeners.forEach((l) => l());
});

export const useRoute = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => current,
  );

export function go(path: string) {
  if (location.hash !== `#${path}`) location.hash = path;
}
