import { describe, expect, it } from 'vitest';
import { actionsQueryString } from './actions';

describe('actionsQueryString', () => {
  it('keeps the filters that are set, in a stable order', () => {
    expect(actionsQueryString({ period: '7d', targetType: 'setting', targetId: 'a b' })).toBe(
      'targetType=setting&targetId=a+b&period=7d',
    );
  });

  it('leaves out what is empty', () => {
    expect(actionsQueryString({ action: '', cursor: undefined })).toBe('');
  });
});
