import type { Certification, CertificationCriterionKey, Me } from '@widoo/shared';
import { dateFormat } from '../i18n/formats';

/**
 * What the « Devenez créateur certifié » card says is missing (Ecrans › E-09, pas encore
 * certifié): one criterion with how many routes it lacks, or how many criteria remain.
 */
export type CertificationGap =
  | { kind: 'count'; criterion: Exclude<CertificationCriterionKey, 'averageRating'>; count: number }
  | { kind: 'rating'; threshold: number }
  | { kind: 'several'; count: number };

/** Null once certified, or when every criterion is met and the badge is on its way. */
export function certificationGap(certification: Certification): CertificationGap | null {
  if (certification.isCertified) {
    return null;
  }
  const unmet = certification.criteria.filter((criterion) => !criterion.isMet);
  const [only] = unmet;
  if (!only) {
    return null;
  }
  if (unmet.length > 1) {
    return { kind: 'several', count: unmet.length };
  }
  if (only.criterion === 'averageRating') {
    return { kind: 'rating', threshold: only.threshold };
  }
  return {
    kind: 'count',
    criterion: only.criterion,
    count: Math.max(1, Math.ceil(only.threshold - (only.value ?? 0))),
  };
}

/** The three steps of « Complétez votre profil »; the neighbourhood, optional, is not one. */
export const completionSteps = ['photo', 'bio', 'anecdote'] as const;
export type CompletionStep = (typeof completionSteps)[number];

export function completionOf(me: Me): { step: CompletionStep; isDone: boolean }[] {
  const isDone: Record<CompletionStep, boolean> = {
    photo: me.avatarUrl !== null,
    bio: (me.bio ?? '') !== '',
    anecdote: me.anecdotes.length > 0,
  };
  return completionSteps.map((step) => ({ step, isDone: isDone[step] }));
}

/** « mars 2026 » or « March 2026 », for « sur Widoo depuis mars 2026 », in local time. */
export function memberSince(createdAt: string): string {
  return dateFormat({ month: 'long', year: 'numeric' }).format(new Date(createdAt));
}
