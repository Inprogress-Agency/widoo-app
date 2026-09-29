import type { RouteCard } from './schemas/route';

/** Step of the displayed budget, in euros (Orchestration, D-032). */
const BUDGET_STEP_EUR = 5;

/**
 * Budget per person as displayed (Orchestration, D-032): the sum of the costs rounded to the
 * nearest 5 €, 5 € for a sum that is not zero but would round to it, 0 when it is free. The
 * bucket of the filters keeps the exact sum: the rounding is for display only.
 */
export function displayedBudgetEur(sumEur: number): number {
  if (sumEur <= 0) {
    return 0;
  }
  return Math.max(BUDGET_STEP_EUR, Math.round(sumEur / BUDGET_STEP_EUR) * BUDGET_STEP_EUR);
}

/** Sum of the step costs of a card, as the search answers it (D-032). */
export function budgetSumEur({
  budgetPerPersonEur,
}: Pick<RouteCard, 'budgetPerPersonEur'>): number {
  return budgetPerPersonEur;
}
