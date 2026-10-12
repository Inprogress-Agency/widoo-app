import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { showToast } from './toast';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

afterEach(() => vi.clearAllMocks());

describe('showToast', () => {
  it.each([
    ['success', 4000],
    ['info', 4000],
    ['warning', 6000],
  ] as const)('keeps a %s toast %i ms', (kind, duration) => {
    showToast(kind, { title: 'Parcours publié' });
    expect(toast[kind]).toHaveBeenCalledWith(
      'Parcours publié',
      expect.objectContaining({ duration }),
    );
  });

  it('keeps an error until the person acts', () => {
    showToast('error', { title: 'Publication impossible' });
    expect(toast.error).toHaveBeenCalledWith(
      'Publication impossible',
      expect.objectContaining({ duration: Infinity }),
    );
  });

  it('keeps a toast with an action to undo 6 seconds', () => {
    const action = { label: 'Annuler', onClick: () => undefined };
    showToast('success', { title: 'Signalement rejeté', action });
    expect(toast.success).toHaveBeenCalledWith(
      'Signalement rejeté',
      expect.objectContaining({ duration: 6000, action }),
    );
  });
});
