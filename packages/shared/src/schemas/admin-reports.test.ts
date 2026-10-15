import { describe, expect, it } from 'vitest';
import { AdminReportsQuery, ResolveReportBody } from './admin-reports';

describe('ResolveReportBody', () => {
  it('takes an outcome, with an optional note', () => {
    expect(ResolveReportBody.parse({ outcome: 'accepted' })).toEqual({ outcome: 'accepted' });
    expect(ResolveReportBody.parse({ outcome: 'rejected', note: ' Déjà corrigé ' })).toEqual({
      outcome: 'rejected',
      note: 'Déjà corrigé',
    });
  });

  it('refuses an open report as an outcome, markup and unknown fields', () => {
    expect(ResolveReportBody.safeParse({ outcome: 'open' }).success).toBe(false);
    expect(ResolveReportBody.safeParse({ outcome: 'accepted', note: '<b>x</b>' }).success).toBe(
      false,
    );
    expect(ResolveReportBody.safeParse({ outcome: 'accepted', status: 'x' }).success).toBe(false);
  });
});

describe('AdminReportsQuery', () => {
  it('knows the reasons of a report, the system one included', () => {
    expect(AdminReportsQuery.safeParse({ reason: 'low_rating' }).success).toBe(true);
    expect(AdminReportsQuery.safeParse({ reason: 'spam' }).success).toBe(false);
  });
});
