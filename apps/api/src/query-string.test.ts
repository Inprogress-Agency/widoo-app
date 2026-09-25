import { describe, expect, it } from 'vitest';
import { parseQueryString } from './query-string';

describe('parseQueryString', () => {
  it('reads a key with brackets as the plain key, always as a list', () => {
    expect(parseQueryString('budgets[]=high')).toEqual({ budgets: ['high'] });
    expect(parseQueryString('moods%5B%5D=food&moods%5B%5D=culture')).toEqual({
      moods: ['food', 'culture'],
    });
  });

  it('keeps a single plain key as a string and a repeated one as a list', () => {
    expect(parseQueryString('bbox=2.33,48.85,2.37,48.87&moods=food&moods=culture')).toEqual({
      bbox: '2.33,48.85,2.37,48.87',
      moods: ['food', 'culture'],
    });
  });

  it('merges both notations of the same key', () => {
    expect(parseQueryString('moods=food&moods[]=culture')).toEqual({
      moods: ['food', 'culture'],
    });
  });

  it('leaves other bracket notations and prototype keys as plain keys', () => {
    const parsed = parseQueryString('moods[0]=food&__proto__=x&constructor=y');
    expect(Object.keys(parsed)).toEqual(['moods[0]', '__proto__', 'constructor']);
    expect(Object.getPrototypeOf(parsed)).toBeNull();
  });

  it('decodes plus signs and percent escapes', () => {
    expect(parseQueryString('q=place+des%20Vosges')).toEqual({ q: 'place des Vosges' });
  });
});
