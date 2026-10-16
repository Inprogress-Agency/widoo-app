import type { AffiliateProgram } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { emptyProgramForm, programFormOf, programInputOf, programPatchOf } from './program-form';

const program: AffiliateProgram = {
  id: '0199d1ec-0000-7000-8000-000000000000',
  name: 'Awin Paris',
  network: 'Awin',
  commissionNote: '5 %',
  cookieDays: 30,
  isActive: true,
  placeCount: 2,
  createdAt: '2026-10-16T10:00:00.000Z',
};

describe('programInputOf', () => {
  it('trims the texts and turns an empty note into none', () => {
    expect(
      programInputOf({ ...emptyProgramForm, name: ' Awin ', network: 'Awin', commissionNote: ' ' }),
    ).toEqual({
      name: 'Awin',
      network: 'Awin',
      commissionNote: null,
      cookieDays: 30,
      isActive: true,
    });
  });

  it('is null while the cookie is not a number of days', () => {
    expect(programInputOf({ ...emptyProgramForm, cookieDays: '' })).toBeNull();
    expect(programInputOf({ ...emptyProgramForm, cookieDays: '3,5' })).toBeNull();
    expect(programInputOf({ ...emptyProgramForm, cookieDays: '-1' })).toBeNull();
  });
});

describe('programPatchOf', () => {
  it('has nothing to send for a form that is unchanged', () => {
    expect(programPatchOf(program, programFormOf(program))).toEqual({});
  });

  it('sends only the fields that changed', () => {
    expect(
      programPatchOf(program, { ...programFormOf(program), cookieDays: '45', isActive: false }),
    ).toEqual({ cookieDays: 45, isActive: false });
    expect(programPatchOf(program, { ...programFormOf(program), commissionNote: '' })).toEqual({
      commissionNote: null,
    });
  });
});
