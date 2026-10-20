import { describe, expect, it } from 'vitest';
import { previewOf } from './admin';

describe('previewOf', () => {
  it('keeps a short message, on one line', () => {
    expect(previewOf('Bonjour,\n\nune question.')).toBe('Bonjour, une question.');
  });

  it('cuts a long message on a character, with an ellipsis', () => {
    const preview = previewOf(`${'a'.repeat(200)}`);
    expect([...preview]).toHaveLength(121);
    expect(preview.endsWith('…')).toBe(true);
    const emojis = previewOf('😀'.repeat(200));
    expect([...emojis].every((character) => character === '😀' || character === '…')).toBe(true);
  });
});
