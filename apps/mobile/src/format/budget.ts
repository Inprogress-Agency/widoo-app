import { budgetSumEur, displayedBudgetEur, type RouteCard } from '@widoo/shared';
import type { TFunction } from 'i18next';

/** A budget as the card writes it: the key figure, and « par pers. » after it unless free. */
export interface BudgetText {
  amount: string;
  perPerson: string | null;
  /** What a screen reader says: « environ 25 euros par personne », « Gratuit ». */
  spoken: string;
}

/**
 * Budget per person of a route (Orchestration, D-032): « ≈ 25 € par pers. », « ≈ 5 € » for a
 * small sum, « Gratuit » when it is zero; never « env. », never a range.
 */
export function formatBudget(
  t: TFunction,
  route: Pick<RouteCard, 'budgetPerPersonEur'>,
): BudgetText {
  const euros = displayedBudgetEur(budgetSumEur(route));
  if (euros === 0) {
    const free = t('budget.free');
    return { amount: free, perPerson: null, spoken: free };
  }
  return {
    amount: t('budget.amount', { euros }),
    perPerson: t('budget.perPerson'),
    spoken: t('budget.spoken', { euros }),
  };
}
