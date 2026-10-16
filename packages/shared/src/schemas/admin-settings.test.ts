import { describe, expect, it } from 'vitest';
import { AdminActionsQuery } from './admin-actions';
import { UpdateSettingBody } from './admin-settings';

describe('UpdateSettingBody', () => {
  it('takes a number or an object of numbers, with a reason', () => {
    expect(UpdateSettingBody.safeParse({ value: 5, reason: 'Plus exigeant' }).success).toBe(true);
    expect(UpdateSettingBody.safeParse({ value: { proximity: 2 }, reason: 'Test' }).success).toBe(
      true,
    );
  });

  it('refuses a missing or blank reason, a text value and an unknown field', () => {
    expect(UpdateSettingBody.safeParse({ value: 5 }).success).toBe(false);
    expect(UpdateSettingBody.safeParse({ value: 5, reason: '  ' }).success).toBe(false);
    expect(UpdateSettingBody.safeParse({ value: '5', reason: 'x' }).success).toBe(false);
    expect(UpdateSettingBody.safeParse({ value: 5, reason: 'x', extra: 1 }).success).toBe(false);
  });
});

describe('AdminActionsQuery', () => {
  it('takes the filters of the journal and refuses an unknown period', () => {
    expect(AdminActionsQuery.safeParse({ targetType: 'setting', period: '7d' }).success).toBe(true);
    expect(AdminActionsQuery.safeParse({ period: '1y' }).success).toBe(false);
  });
});
