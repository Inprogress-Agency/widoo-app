import { describe, expect, it } from 'vitest';
import { RouteReportBody } from './route-report';

const stepId = '0198c1de-0000-7000-8000-000000000001';

describe('RouteReportBody', () => {
  it('takes a reason that takes nothing else', () => {
    for (const reason of [
      'inappropriate',
      'dangerous_place',
      'hidden_ad',
      'copied_content',
      'false_info',
    ]) {
      expect(RouteReportBody.safeParse({ reason }).success).toBe(true);
    }
  });

  it('asks the step of the place for « place_changed », and a comment for « other »', () => {
    expect(RouteReportBody.safeParse({ reason: 'place_changed' }).success).toBe(false);
    expect(RouteReportBody.safeParse({ reason: 'place_changed', stepId }).success).toBe(true);
    expect(
      RouteReportBody.safeParse({ reason: 'place_changed', stepId, comment: 'Fermé depuis lundi' })
        .success,
    ).toBe(true);
    expect(RouteReportBody.safeParse({ reason: 'other' }).success).toBe(false);
    expect(RouteReportBody.safeParse({ reason: 'other', comment: 'Autre chose' }).success).toBe(
      true,
    );
  });

  it('refuses a step or a comment on a reason that takes none', () => {
    expect(RouteReportBody.safeParse({ reason: 'hidden_ad', stepId }).success).toBe(false);
    expect(RouteReportBody.safeParse({ reason: 'hidden_ad', comment: 'Une pub' }).success).toBe(
      false,
    );
    expect(RouteReportBody.safeParse({ reason: 'other', stepId, comment: 'Autre' }).success).toBe(
      false,
    );
  });

  it('refuses the reason of the system, markup, a long comment and an unknown key', () => {
    expect(RouteReportBody.safeParse({ reason: 'low_rating' }).success).toBe(false);
    expect(RouteReportBody.safeParse({ reason: 'other', comment: '<b>x</b>' }).success).toBe(false);
    expect(RouteReportBody.safeParse({ reason: 'other', comment: 'x'.repeat(81) }).success).toBe(
      false,
    );
    expect(RouteReportBody.safeParse({ reason: 'other', comment: 'x'.repeat(80) }).success).toBe(
      true,
    );
    expect(RouteReportBody.safeParse({ reason: 'inappropriate', extra: 1 }).success).toBe(false);
  });
});
