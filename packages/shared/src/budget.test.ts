import { describe, expect, it } from 'vitest';
import { budgetSumEur, displayedBudgetEur } from './budget';

describe('displayedBudgetEur', () => {
  it.each([
    [0, 0],
    [0.5, 5],
    [2.4, 5],
    [7.4, 5],
    [7.5, 10],
    [23, 25],
    [27.4, 25],
    [48, 50],
    [72.5, 75],
  ])('shows %d € as %d €', (sum, shown) => {
    expect(displayedBudgetEur(sum)).toBe(shown);
  });

  it('treats a negative sum as free', () => {
    expect(displayedBudgetEur(-3)).toBe(0);
  });
});

describe('budgetSumEur', () => {
  it('reads the sum the search answers, exact', () => {
    expect(budgetSumEur({ budgetPerPersonEur: 22 })).toBe(22);
    expect(budgetSumEur({ budgetPerPersonEur: 0 })).toBe(0);
  });
});
