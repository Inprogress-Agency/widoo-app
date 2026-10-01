import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { planMotion } from './motion';

const require = createRequire(import.meta.url);
const tailwind = require('../../tailwind.config.cjs') as {
  theme: { extend: { animation: Record<string, string> } };
};
const animation = tailwind.theme.extend.animation;

describe('timings of the plan (E-21 › Mouvement)', () => {
  it('are the same in the animations of Tailwind and in the delays of the steps', () => {
    expect(animation['plan-draw']).toBe(
      `plan-draw ${planMotion.drawDuration}ms linear ${planMotion.drawDelay}ms both`,
    );
    expect(animation['plan-pop']).toContain(`${planMotion.popDuration}ms`);
    expect(animation['plan-fade']).toContain(`${planMotion.fadeDuration}ms`);
  });

  it('follow the mockup: the line starts at 300 ms and draws in 1.8 s', () => {
    expect(planMotion).toMatchObject({ drawDelay: 300, drawDuration: 1800, popDuration: 260 });
  });
});
