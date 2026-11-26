import { useSyncExternalStore } from 'react';

export type ToastKind = 'success' | 'error' | 'info';
export interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
  leaving?: boolean;
}

let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = (next: Toast[]) => {
  toasts = next;
  listeners.forEach((l) => l());
};

export function toast(text: string, kind: ToastKind = 'success') {
  const id = ++seq;
  emit([...toasts.slice(-2), { id, text, kind }]);
  setTimeout(() => emit(toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t))), 2400);
  setTimeout(() => emit(toasts.filter((t) => t.id !== id)), 2700);
}

export const useToasts = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => toasts,
  );
