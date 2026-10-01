/**
 * Timings of the plan (E-21 › Mouvement), in milliseconds. The animations of
 * tailwind.config.cjs use the same values (checked by the tests).
 */
export const planMotion = {
  /** The line starts drawing after this delay… */
  drawDelay: 300,
  /** …and takes this long, at a constant speed. */
  drawDuration: 1800,
  /** A step appears when the line reaches it, in this time. */
  popDuration: 260,
  /** Its name, then the walking time that leaves it, follow by this gap each. */
  followGap: 120,
  /** With « Réduire les animations »: a fade without movement (motion.durations.fade). */
  fadeDuration: 200,
} as const;
