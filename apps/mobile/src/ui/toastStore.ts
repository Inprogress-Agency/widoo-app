import { toast as toastTokens } from '@widoo/tokens';
import { createStore } from 'zustand/vanilla';

export type ToastKind = keyof typeof toastTokens.states;

export interface ToastMessage {
  /** A new toast replaces the one shown: one at a time (`mappings.toast`). */
  id: number;
  kind: ToastKind;
  title: string;
}

/** The toast shown, by the host at the root of the app. */
export const toastStore = createStore<{ toast: ToastMessage | null }>(() => ({ toast: null }));

let nextId = 1;

/** Result of an action (M-06): « Nouveau lien envoyé ». Never a lasting state. */
export function showToast(kind: ToastKind, title: string) {
  toastStore.setState({ toast: { id: nextId++, kind, title } });
}

export function hideToast(id: number) {
  if (toastStore.getState().toast?.id === id) {
    toastStore.setState({ toast: null });
  }
}

/** How long a toast stays: 4 s, 6 s for an attention, until an action or a swipe for an error. */
export function toastDurationMs(kind: ToastKind): number | null {
  const seconds = toastTokens.states[kind].seconds;
  return seconds === null ? null : seconds * 1000;
}
