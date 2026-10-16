import { ApiRequestError } from '@widoo/api-client';
import { describe, expect, it } from 'vitest';
import { failureOf } from './place-save-failure';

const apiError = (status: number, message = 'x') =>
  new ApiRequestError('http', status, { code: 'validation_error', message });

describe('failureOf', () => {
  it('tells a field the schema refuses (422) as a refused field', () => {
    expect(failureOf(apiError(422))).toBe('refused');
  });

  it('tells a position outside every city apart from a rule of the place', () => {
    expect(failureOf(apiError(400, 'Position outside every city'))).toBe('outside');
    expect(failureOf(apiError(400, 'Unknown affiliate program'))).toBe('refused');
  });

  it('keeps any other failure as a failure to save', () => {
    expect(failureOf(apiError(500))).toBe('failed');
    expect(failureOf(new Error('offline'))).toBe('failed');
  });
});
