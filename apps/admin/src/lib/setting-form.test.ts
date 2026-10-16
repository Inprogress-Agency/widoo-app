import { describe, expect, it } from 'vitest';
import { fieldsOf, valueOfFields } from './setting-form';

const steps = { value: 4 };
const weights = { value: { proximity: 0.3, quality: 0.25 } };

describe('fieldsOf', () => {
  it('fills one field for a number and one per weight', () => {
    expect(fieldsOf(steps)).toEqual({ value: '4' });
    expect(fieldsOf(weights)).toEqual({ proximity: '0,3', quality: '0,25' });
  });
});

describe('valueOfFields', () => {
  it('reads a number, with a French decimal comma', () => {
    expect(valueOfFields(steps, { value: '5' })).toBe(5);
    expect(valueOfFields({ value: 4.5 }, { value: '4,5' })).toBe(4.5);
  });

  it('reads all the weights', () => {
    expect(valueOfFields(weights, { proximity: '1', quality: '2,5' })).toEqual({
      proximity: 1,
      quality: 2.5,
    });
  });

  it('is null while a field is empty or not a number', () => {
    expect(valueOfFields(steps, { value: '' })).toBeNull();
    expect(valueOfFields(steps, { value: 'abc' })).toBeNull();
    expect(valueOfFields(weights, { proximity: '1', quality: '' })).toBeNull();
  });
});
