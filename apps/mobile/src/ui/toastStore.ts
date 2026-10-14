import { toast as toastTokens } from '@widoo/tokens';
import { createStore } from 'zustand/vanilla';

export type ToastKind = keyof typeof toastTokens.states;

/** The action of a toast, in its small pill: « Réessayer ». */
export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  /** Second line: « Rien n'est perdu. ». */
  subtitle?: string;
  action?: ToastAction;
  /** Over the tab bar, for a toast shown on a tab: « Profil enregistré. » (Ecrans › E-09). */
  isAboveTabBar?: boolean;
  /** Over the bar stuck under the route sheet: « Sortie programmée » (Ecrans › E-06). */
  isAboveStickyBar?: boolean;
}

export interface ToastMessage extends ToastOptions {
  /** A new toast replaces the one shown: one at a time (`mappings.toast`). */
  id: number;
  kind: ToastKind;
  title: string;
}

interface ToastState {
  toast: ToastMessage | null;
  /** Height of the floating tab bar, which a toast on a tab stays above. */
  tabBarHeight: number;
  /** Height of the last bar stuck to the bottom of a screen laid out (`StickyBar`). */
  stickyBarHeight: number;
}

/** The toast shown, by the host at the root of the app. */
export const toastStore = createStore<ToastState>(() => ({
  toast: null,
  tabBarHeight: 0,
  stickyBarHeight: 0,
}));

let nextId = 1;

/** Result of an action (M-06): « Nouveau lien envoyé ». Never a lasting state. */
export function showToast(kind: ToastKind, title: string, options: ToastOptions = {}) {
  toastStore.setState({ toast: { id: nextId++, kind, title, ...options } });
}

export function hideToast(id: number) {
  if (toastStore.getState().toast?.id === id) {
    toastStore.setState({ toast: null });
  }
}

/** Measured by the tab bar as it lays out. */
export function setTabBarHeight(height: number) {
  toastStore.setState({ tabBarHeight: height });
}

/** Measured by a sticky bar as it lays out. */
export function setStickyBarHeight(height: number) {
  toastStore.setState({ stickyBarHeight: height });
}

/** How long a toast stays: 4 s, 6 s for an attention, until an action or a swipe for an error. */
export function toastDurationMs(kind: ToastKind): number | null {
  const seconds = toastTokens.states[kind].seconds;
  return seconds === null ? null : seconds * 1000;
}

/** What the screen readers hear: the title, then the subtitle. */
export function toastAnnouncement(toast: Pick<ToastMessage, 'title' | 'subtitle'>): string {
  return toast.subtitle ? `${toast.title}. ${toast.subtitle}` : toast.title;
}
