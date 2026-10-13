import { messages } from '@/messages/fr';
import type { PlaceImportOutcome } from '@widoo/shared';
import { StatusBadge } from '@widoo/ui';
import type { ComponentProps } from 'react';

const tones: Record<PlaceImportOutcome, ComponentProps<typeof StatusBadge>['tone']> = {
  ready: 'info',
  created: 'success',
  invalid: 'error',
  duplicate: 'alert',
  outside: 'alert',
};

/** What became of a line of an import: « Prêt », « Créé », « Invalide », « Doublon »… */
export function PlaceImportOutcomeBadge({ outcome }: { outcome: PlaceImportOutcome }) {
  return (
    <StatusBadge tone={tones[outcome]}>
      {messages.catalog.places.import.outcomes[outcome]}
    </StatusBadge>
  );
}
