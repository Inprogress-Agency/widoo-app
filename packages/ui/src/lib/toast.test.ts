import { toast } from 'sonner';
import { afterEach, describe, expect, it } from 'vitest';
import { showToast } from './toast';

// The store of Sonner itself, without its Toaster: the toasts it holds are the ones on screen.
afterEach(() => {
  toast.dismiss();
});

describe('showToast', () => {
  it.each([
    ['success', 4000],
    ['info', 4000],
    ['warning', 6000],
  ] as const)('keeps a %s toast %i ms, without a button to close it', (kind, duration) => {
    showToast(kind, { title: 'Parcours publié' });
    expect(toast.getToasts()).toEqual([
      expect.objectContaining({
        type: kind,
        title: 'Parcours publié',
        duration,
        closeButton: false,
      }),
    ]);
  });

  it('keeps an error until the person acts, with a button to close it', () => {
    showToast('error', { title: 'Publication impossible' });
    expect(toast.getToasts()).toEqual([
      expect.objectContaining({ type: 'error', duration: Infinity, closeButton: true }),
    ]);
  });

  it('keeps a toast with an action to undo 6 seconds', () => {
    const action = { label: 'Annuler', onClick: () => undefined };
    showToast('success', { title: 'Signalement rejeté', action });
    expect(toast.getToasts()).toEqual([expect.objectContaining({ duration: 6000, action })]);
  });

  it('takes the error away as soon as the action it told of succeeds', () => {
    showToast('error', { title: 'Le message a été refusé.' });
    showToast('success', { title: 'Modifications demandées' });
    expect(toast.getToasts()).toEqual([
      expect.objectContaining({ type: 'success', title: 'Modifications demandées' }),
    ]);
  });

  it('shows one toast at a time, whatever their kinds', () => {
    showToast('success', { title: 'Parcours publié' });
    showToast('info', { title: 'Déjà traité' });
    showToast('warning', { title: 'Lieu fermé' });
    showToast('error', { title: 'Publication impossible' });
    expect(toast.getToasts()).toEqual([
      expect.objectContaining({ type: 'error', title: 'Publication impossible' }),
    ]);
  });
});
