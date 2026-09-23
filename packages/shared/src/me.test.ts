import { describe, expect, it } from 'vitest';
import { FirstName } from '.';

describe('FirstName', () => {
  it.each([
    ['Camille', 'Camille'],
    ['  Anne-Sophie ', 'Anne-Sophie'],
    ['Zoé', 'Zoé'],
  ])('accepts %j as %j', (input, expected) => {
    expect(FirstName.parse(input)).toBe(expected);
  });

  it.each(['', '   ', '<b>Bold</b>', 'Tab\there', 'x'.repeat(51)])('rejects %j', (input) => {
    expect(FirstName.safeParse(input).success).toBe(false);
  });
});
