import { describe, expect, it } from 'vitest';
import { AffiliateProgramInput, AffiliateProgramPatch } from './admin-affiliation';

const program = { name: 'Awin Paris', network: 'Awin', cookieDays: 30 };

describe('AffiliateProgramInput', () => {
  it('takes a program, active by default, with an optional note', () => {
    const parsed = AffiliateProgramInput.parse(program);
    expect(parsed).toMatchObject({ isActive: true, commissionNote: null });
    expect(
      AffiliateProgramInput.safeParse({ ...program, commissionNote: '5 % du panier' }).success,
    ).toBe(true);
  });

  it('refuses a cookie out of bounds, markup in a name and an unknown field', () => {
    expect(AffiliateProgramInput.safeParse({ ...program, cookieDays: 400 }).success).toBe(false);
    expect(AffiliateProgramInput.safeParse({ ...program, cookieDays: -1 }).success).toBe(false);
    expect(AffiliateProgramInput.safeParse({ ...program, name: '<b>x</b>' }).success).toBe(false);
    expect(AffiliateProgramInput.safeParse({ ...program, extra: 1 }).success).toBe(false);
  });
});

describe('AffiliateProgramPatch', () => {
  it('takes some fields, not none', () => {
    expect(AffiliateProgramPatch.safeParse({ isActive: false }).success).toBe(true);
    expect(AffiliateProgramPatch.safeParse({}).success).toBe(false);
    expect(AffiliateProgramPatch.parse({ network: 'Impact' })).toEqual({ network: 'Impact' });
  });
});
