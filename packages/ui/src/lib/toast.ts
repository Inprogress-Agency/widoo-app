import { toast } from 'sonner';

/** An action offered inside a toast: « Réessayer », « Annuler ». */
export type ToastAction = { label: string; onClick: () => void };

type ToastContent = {
  title: string;
  /** Second line: what follows from the action (« Camille est prévenue. »). */
  description?: string;
  action?: ToastAction;
};

/** How long each kind of toast stays (wiki Ecrans › Admin web, « Toast »), in milliseconds. */
export const toastDurations = {
  success: 4000,
  info: 4000,
  warning: 6000,
  /** An error stays until the person acts on it or dismisses it. */
  error: Infinity,
} as const;

type ToastKind = keyof typeof toastDurations;

/**
 * Shows the result of an action in a toast. A toast with an action to undo it stays 6 seconds,
 * as the attention ones.
 */
export function showToast(kind: ToastKind, { title, description, action }: ToastContent): void {
  const duration =
    action && kind !== 'error'
      ? Math.max(toastDurations[kind], toastDurations.warning)
      : toastDurations[kind];
  toast[kind](title, { description, action, duration });
}
