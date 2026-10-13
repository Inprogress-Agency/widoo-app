'use client';

import { AccessDenied } from '@/components/states/AccessDenied';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import type { ReactNode } from 'react';

type AdminOnlyGateProps = { backHref: string; backLabel: string; children: ReactNode };

/** Around a page of the admins: any other role gets a refusal, whatever the address typed. */
export function AdminOnlyGate({ backHref, backLabel, children }: AdminOnlyGateProps) {
  const isAdmin = useIsAdmin();
  return isAdmin ? children : <AccessDenied backHref={backHref} backLabel={backLabel} />;
}
