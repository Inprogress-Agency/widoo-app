import { describe, expect, it } from 'vitest';
import { inPhotoSlot } from './slot';

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('inPhotoSlot', () => {
  it('runs one task at a time, in their order, a failure releasing the slot', async () => {
    let running = 0;
    let most = 0;
    const order: string[] = [];
    const task = (name: string, fails = false) =>
      inPhotoSlot(async () => {
        running += 1;
        most = Math.max(most, running);
        await pause(10);
        order.push(name);
        running -= 1;
        if (fails) throw new Error(`${name} failed`);
        return name;
      });

    const results = await Promise.allSettled([task('a'), task('b', true), task('c')]);

    expect(most).toBe(1);
    expect(order).toEqual(['a', 'b', 'c']);
    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected', 'fulfilled']);
  });
});
