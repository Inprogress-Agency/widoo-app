'use client';

import { PartnerRoutesDialog } from '@/components/b2b/PartnerRoutesDialog';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { usePartnerActions } from '@/hooks/usePartnerActions';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getSessionClients } from '@/lib/auth/clients';
import {
  isChoiceComplete,
  withMovedRoute,
  withoutRoute,
  withRoute,
  type PickedRoute,
} from '@/lib/partner-routes';
import type { B2bClient } from '@widoo/shared';
import { useState } from 'react';

const searchDelayMs = 300;

type PartnerRoutesContainerProps = {
  partner: B2bClient;
  onClose: () => void;
  /** The routes are saved: the card reads again. */
  onSaved: (partner: B2bClient) => void;
};

/**
 * The window that chooses the routes of a partner (A-10): the choice in order, a search among the
 * published routes, and what it sends. It is shown only while it is open, so that each opening
 * starts from the routes the partner has.
 */
export function PartnerRoutesContainer({ partner, onClose, onSaved }: PartnerRoutesContainerProps) {
  const [picked, setPicked] = useState<PickedRoute[]>(() =>
    partner.routes.map((route) => ({ id: route.id, title: route.title })),
  );
  const [search, setSearch] = useState('');
  const handleSearchTyped = useDebouncedCallback(setSearch, searchDelayMs);
  const results = useRemoteData(`routes:${search}`, (signal) =>
    getSessionClients().api.getCatalogRoutes(
      { status: 'published', ...(search.trim() ? { q: search.trim() } : {}) },
      signal,
    ),
  );
  const actions = usePartnerActions((saved) => {
    onClose();
    onSaved(saved);
  });

  return (
    <PartnerRoutesDialog
      isOpen
      picked={picked}
      results={results.status === 'ready' ? results.data.items : undefined}
      onSearchChange={handleSearchTyped}
      onAdd={(route) => setPicked((current) => withRoute(current, route))}
      onRemove={(routeId) => setPicked((current) => withoutRoute(current, routeId))}
      onMove={(routeId, direction) =>
        setPicked((current) => withMovedRoute(current, routeId, direction))
      }
      isComplete={isChoiceComplete(picked)}
      onCancel={onClose}
      onConfirm={() =>
        void actions.setRoutes(
          partner.id,
          picked.map((route) => route.id),
        )
      }
      isBusy={actions.isBusy}
    />
  );
}
