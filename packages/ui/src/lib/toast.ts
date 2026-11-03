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

type ShownToast = ReturnType<typeof toast.getToasts>[number];

const isError = (shown: ShownToast) => 'type' in shown && shown.type === 'error';

/**
 * Shows the result of an action in a toast. One toast at a time (wiki Ecrans › Admin web,
 * « Toast »): the one on screen gives way, so an error goes as soon as the action it told of
 * succeeds. A toast with an action to undo it stays 6 seconds, as the attention ones. An error,
 * which stays until the person acts, has a button to close it.
 */
export function showToast(kind: ToastKind, { title, description, action }: ToastContent): void {
  const duration =
    action && kind !== 'error'
      ? Math.max(toastDurations[kind], toastDurations.warning)
      : toastDurations[kind];
  toast.dismiss();
  toast[kind](title, { description, action, duration, closeButton: kind === 'error' });
}

/**
 * Takes away the error on screen, when the person leaves the page whose action failed. A success
 * or an information stays: it may follow the person to the next page (« Parcours suivant »).
 */
export function dismissErrorToast(): void {
  for (const shown of toast.getToasts()) {
    if (isError(shown)) {
      toast.dismiss(shown.id);
    }
  }
}
