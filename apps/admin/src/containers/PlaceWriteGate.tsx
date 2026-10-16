'use client';

import { catalogPaths } from '@/components/catalog/CatalogTabs';
import { AccessDenied } from '@/components/states/AccessDenied';
import { useCanWriteCatalog } from '@/hooks/useCanWriteCatalog';
import { messages } from '@/messages/fr';
import type { ReactNode } from 'react';

/**
 * Around the pages that write a place: a member whose role only reads the places gets a refusal
 * instead of the form, whatever the address typed.
 */
export function PlaceWriteGate({ children }: { children: ReactNode }) {
  const canWrite = useCanWriteCatalog();
  if (!canWrite) {
    return (
      <AccessDenied backHref={catalogPaths.places} backLabel={messages.catalog.places.form.back} />
    );
  }
  return children;
}
