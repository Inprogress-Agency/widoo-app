import { accessibility, size, textStyles } from '@widoo/tokens';
import { describe, expect, it } from 'vitest';
import {
  coverSquare,
  durationLabel,
  durationTextFactor,
  labelPill,
  markerPhoto,
  photoOffsetY,
} from './markerShape';

describe('durationLabel', () => {
  it('sizes the text as number-s at the system text setting', () => {
    expect(durationLabel(1).textSize).toBe(textStyles['number-s'].fontSize);
    expect(durationLabel(1.2).textSize).toBeCloseTo(textStyles['number-s'].fontSize * 1.2);
  });

  it('caps the text at the factor of dense components', () => {
    expect(durationTextFactor(1.5)).toBe(accessibility.maxFontSizeMultiplierDense);
    expect(durationTextFactor(3.1)).toBe(accessibility.maxFontSizeMultiplierDense);
    expect(durationLabel(1.5).textSize).toBeCloseTo(
      textStyles['number-s'].fontSize * accessibility.maxFontSizeMultiplierDense,
    );
  });

  it('centres the text in the pill', () => {
    const label = durationLabel(1);
    expect(label.textOffsetY * label.textSize).toBeCloseTo(-label.pillHeight / 2);
  });

  it('keeps the pill at least at the badge height', () => {
    expect(durationLabel(1).pillHeight).toBe(size['badge-h']);
    expect(durationLabel(2).pillHeight).toBeGreaterThanOrEqual(size['badge-h']);
  });
});

describe('labelPill', () => {
  it('stretches only a middle column, between two round ends', () => {
    const pill = labelPill(26);
    expect(pill).toMatchObject({ width: 27, height: 26, radius: 13 });
    expect(pill.stretchX).toEqual([[13, 14]]);
  });
});

describe('markerPhoto', () => {
  it('is the marker size, with the point under it', () => {
    expect(markerPhoto.width).toBe(size.marker);
    expect(markerPhoto.height).toBeGreaterThanOrEqual(size.marker + markerPhoto.pointDepth);
  });

  it('sits above the label, its point just over the pill', () => {
    const pillHeight = size['badge-h'];
    const imageBottom = photoOffsetY(pillHeight);
    const tip = imageBottom - (markerPhoto.height - markerPhoto.side) + markerPhoto.pointDepth;
    // The tip ends above the top of the label, which hangs by its bottom from the route start.
    expect(tip).toBeLessThan(-pillHeight);
    expect(tip).toBeGreaterThan(-pillHeight - markerPhoto.pointDepth);
  });
});

describe('coverSquare', () => {
  it('takes the middle square of a landscape or portrait photo', () => {
    expect(coverSquare(1200, 800)).toEqual({ x: 200, y: 0, side: 800 });
    expect(coverSquare(600, 900)).toEqual({ x: 0, y: 150, side: 600 });
  });
});
