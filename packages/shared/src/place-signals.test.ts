import { describe, expect, it } from 'vitest';
import {
  afterConfirmation,
  areSignalsIgnored,
  countsTowardFlag,
  defaultVerificationRules as rules,
  flagsPlace,
  placeSignalWeightOf,
  verificationRulesOf,
} from './place-signals';
import { taxonomies } from './taxonomies';

const now = new Date('2026-11-03T12:00:00.000Z');
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000);

describe('verificationRulesOf', () => {
  it('holds the values of the wiki without settings', () => {
    expect(verificationRulesOf({})).toEqual({
      confirmationsToVerify: 3,
      reportsToFlag: 2,
      reportWindowDays: 30,
      staleAfterDays: 90,
      signalIntervalDays: 7,
      onSiteWeight: 2,
      afterOutingWeight: 1.5,
      newAccountWeight: 0.5,
      newAccountHours: 24,
      rejectionsToIgnore: 3,
      ignoreDays: 90,
    });
  });

  it.each([
    ['a zero threshold', 'verification.confirmations_to_verify', 0],
    ['a fractional count', 'verification.reports_to_flag', 1.5],
    ['a weight above 10', 'verification.weight_on_site', 11],
    ['a string', 'verification.stale_after_days', '90'],
  ])('falls back to the default on %s, the other rules kept', (_, key, value) => {
    expect(verificationRulesOf({ [key]: value, 'verification.ignore_days': 30 })).toEqual({
      ...rules,
      ignoreDays: 30,
    });
  });
});

describe('placeSignalWeightOf', () => {
  const old = hoursAgo(48);

  it('weighs 2 on site and 1.5 after the outing, times the trust score', () => {
    const signal = { accountCreatedAt: old, trustScore: 1 };
    expect(placeSignalWeightOf({ ...signal, context: 'on_site' }, now, rules)).toBe(2);
    expect(placeSignalWeightOf({ ...signal, context: 'after_outing' }, now, rules)).toBe(1.5);
    expect(
      placeSignalWeightOf({ ...signal, context: 'on_site', trustScore: 0.5 }, now, rules),
    ).toBe(1);
  });

  it('weighs 0.5 from an account younger than 24 hours, whatever the context', () => {
    for (const context of ['on_site', 'after_outing'] as const) {
      const young = { context, accountCreatedAt: hoursAgo(23), trustScore: 1 };
      expect(placeSignalWeightOf(young, now, rules)).toBe(0.5);
    }
    const dayOld = { context: 'on_site' as const, accountCreatedAt: hoursAgo(24), trustScore: 1 };
    expect(placeSignalWeightOf(dayOld, now, rules)).toBe(2);
  });

  it('never weighs below zero, and follows the settings', () => {
    const signal = { context: 'on_site' as const, accountCreatedAt: old, trustScore: -1 };
    expect(placeSignalWeightOf(signal, now, rules)).toBe(0);
    const custom = { ...rules, onSiteWeight: 4 };
    expect(placeSignalWeightOf({ ...signal, trustScore: 1 }, now, custom)).toBe(4);
  });
});

describe('afterConfirmation', () => {
  it('verifies the place again at 3 weighted confirmations, the counter back to zero', () => {
    const first = afterConfirmation({ status: 'stale', confirmationsSinceVerified: 0 }, 1.5, rules);
    expect(first).toEqual({ status: 'stale', confirmationsSinceVerified: 1.5, isVerified: false });
    const second = afterConfirmation(
      { status: 'stale', confirmationsSinceVerified: 1.5 },
      1.5,
      rules,
    );
    expect(second).toEqual({ status: 'verified', confirmationsSinceVerified: 0, isVerified: true });
    // Three accounts younger than a day: 1.5, not yet.
    expect(
      afterConfirmation({ status: 'unverified', confirmationsSinceVerified: 1 }, 0.5, rules),
    ).toMatchObject({ isVerified: false, confirmationsSinceVerified: 1.5 });
  });

  it('leaves a place flagged or closed to the team', () => {
    for (const status of ['flagged', 'closed'] as const) {
      expect(afterConfirmation({ status, confirmationsSinceVerified: 2.5 }, 2, rules)).toBeNull();
    }
  });
});

describe('flagsPlace', () => {
  const report = { reason: 'closed_temporarily' as const, hasCompletedGoThere: false };

  it('flags at 2 accounts reporting the same reason', () => {
    expect(flagsPlace({ ...report, concordantAccounts: 1 }, 'verified', rules)).toBe(false);
    expect(flagsPlace({ ...report, concordantAccounts: 2 }, 'verified', rules)).toBe(true);
    expect(flagsPlace({ ...report, concordantAccounts: 2 }, 'unverified', rules)).toBe(true);
  });

  it('flags at one « closed_permanently » from an account that completed a Go there', () => {
    const closed = { reason: 'closed_permanently' as const, concordantAccounts: 1 };
    expect(flagsPlace({ ...closed, hasCompletedGoThere: true }, 'stale', rules)).toBe(true);
    expect(flagsPlace({ ...closed, hasCompletedGoThere: false }, 'stale', rules)).toBe(false);
    expect(
      flagsPlace({ ...report, concordantAccounts: 1, hasCompletedGoThere: true }, 'stale', rules),
    ).toBe(false);
  });

  it('never flags on a field alert, nor a place that waits for the team', () => {
    for (const reason of ['closed_today', 'works', 'crowded'] as const) {
      expect(countsTowardFlag(reason)).toBe(false);
      expect(flagsPlace({ ...report, reason, concordantAccounts: 5 }, 'verified', rules)).toBe(
        false,
      );
    }
    expect(flagsPlace({ ...report, concordantAccounts: 5 }, 'closed', rules)).toBe(false);
    expect(taxonomies.signalReasons.filter(countsTowardFlag).sort()).toEqual([
      'closed_permanently',
      'closed_temporarily',
      'not_as_described',
      'other',
      'wrong_address',
      'wrong_hours',
    ]);
  });
});

describe('areSignalsIgnored', () => {
  it('ignores an account for 90 days after its third rejected report', () => {
    const rejected = (count: number, days: number) => ({ count, lastAt: hoursAgo(days * 24) });
    expect(areSignalsIgnored(rejected(2, 1), now, rules)).toBe(false);
    expect(areSignalsIgnored(rejected(3, 1), now, rules)).toBe(true);
    expect(areSignalsIgnored(rejected(3, 89), now, rules)).toBe(true);
    expect(areSignalsIgnored(rejected(3, 90), now, rules)).toBe(false);
    expect(areSignalsIgnored({ count: 0, lastAt: null }, now, rules)).toBe(false);
  });
});
