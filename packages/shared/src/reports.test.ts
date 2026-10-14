import { describe, expect, it } from 'vitest';
import {
  blocksNewRouteReport,
  notificationKinds,
  routeReportCommentRuleOf,
  routeReportNeedsStep,
  routeReportReasons,
  routeReportWindowStart,
  systemRouteReportReason,
  userRouteReportReasons,
} from './reports';

const now = new Date('2026-10-14T12:00:00Z');
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

describe('route report reasons', () => {
  it('offers the seven reasons of D-056 to the user, place_changed first', () => {
    expect(userRouteReportReasons).toEqual([
      'place_changed',
      'inappropriate',
      'dangerous_place',
      'hidden_ad',
      'copied_content',
      'false_info',
      'other',
    ]);
  });

  it('keeps low_rating for the API alone (D-087)', () => {
    expect(routeReportReasons).toContain(systemRouteReportReason);
    expect(userRouteReportReasons).not.toContain(systemRouteReportReason);
  });

  it('names a step for place_changed only', () => {
    expect(routeReportReasons.filter(routeReportNeedsStep)).toEqual(['place_changed']);
  });

  it('requires a comment for other, allows one for place_changed, refuses it otherwise', () => {
    expect(routeReportCommentRuleOf('other')).toBe('required');
    expect(routeReportCommentRuleOf('place_changed')).toBe('optional');
    for (const reason of ['inappropriate', 'hidden_ad', 'low_rating'] as const) {
      expect(routeReportCommentRuleOf(reason)).toBe('none');
    }
  });
});

describe('blocksNewRouteReport (one report per user and route over 7 days)', () => {
  it('starts the window 7 days before now', () => {
    expect(routeReportWindowStart(now)).toEqual(daysAgo(7));
  });

  it('refuses a new report while an open one is less than 7 days old', () => {
    expect(blocksNewRouteReport({ status: 'open', createdAt: now }, now)).toBe(true);
    expect(blocksNewRouteReport({ status: 'open', createdAt: daysAgo(6.99) }, now)).toBe(true);
  });

  it('lets a new report through once the open one is 7 days old', () => {
    expect(blocksNewRouteReport({ status: 'open', createdAt: daysAgo(7) }, now)).toBe(false);
    expect(blocksNewRouteReport({ status: 'open', createdAt: daysAgo(30) }, now)).toBe(false);
  });

  it('no longer blocks once the team decided (D-057)', () => {
    for (const status of ['accepted', 'rejected'] as const) {
      expect(blocksNewRouteReport({ status, createdAt: daysAgo(1) }, now)).toBe(false);
    }
  });
});

describe('notificationKinds', () => {
  it('holds report_resolved beside go_closed', () => {
    expect(notificationKinds).toEqual(['go_closed', 'report_resolved']);
  });
});
