import { useSyncExternalStore } from 'react';
import type { Game, Player } from './model';
import { toast } from './toast';

export interface State {
  players: Player[];
  games: Game[];
  loaded: boolean;
  offline: boolean;
}

let state: State = { players: [], games: [], loaded: false, offline: false };
let pending = 0;
const listeners = new Set<() => void>();

const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

export const getState = () => state;
export const useStore = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
  );

async function request(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

export async function refresh() {
  if (pending) return;
  try {
    const data = await request('GET', '/api/state');
    if (pending) return;
    set({ players: data.players, games: data.games, loaded: true, offline: false });
  } catch {
    set({ loaded: true, offline: true });
  }
}

// Optimistic write: update the UI immediately, sync in the background,
// roll back with an error toast if the server says no.
async function mutate(next: Partial<State>, run: () => Promise<unknown>) {
  const prev = state;
  set(next);
  pending++;
  try {
    await run();
    set({ offline: false });
  } catch (err) {
    state = prev;
    set({});
    toast((err as Error).message || 'Could not save — check your connection', 'error');
  } finally {
    pending--;
  }
}

const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

export const savePlayer = (p: Player) =>
  mutate({ players: upsert(state.players, p) }, () => request('PUT', `/api/players/${p.id}`, p));

export const deletePlayer = (id: string) =>
  mutate({ players: state.players.filter((p) => p.id !== id) }, () => request('DELETE', `/api/players/${id}`));

export const saveGame = (g: Game) =>
  mutate({ games: upsert(state.games, g) }, () => request('PUT', `/api/games/${g.id}`, g));

export const deleteGame = (id: string) =>
  mutate({ games: state.games.filter((g) => g.id !== id) }, () => request('DELETE', `/api/games/${id}`));

export const importAll = (data: { players: Player[]; games: Game[] }) =>
  mutate({ players: data.players, games: data.games }, () => request('PUT', '/api/state', data));

export function startSync() {
  refresh();
  const tick = () => document.visibilityState === 'visible' && refresh();
  const timer = setInterval(tick, 15000);
  document.addEventListener('visibilitychange', tick);
  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', tick);
  };
}

export const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/-/g, '').slice(0, 16);

export const playerMap = (players: Player[]) => new Map(players.map((p) => [p.id, p]));

export const UNKNOWN: Player = { id: '?', name: 'Unknown', emoji: '👤', color: 0, createdAt: '' };
