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

/**
 * Timings of the hero (E-21 › Mouvement), in milliseconds; `rise` and `land` of
 * tailwind.config.cjs use the same durations (checked by the tests).
 */
export const heroMotion = {
  /** The text of the hero rises 10 px in this time… */
  textDuration: 500,
  /** …each line this long after the previous one. */
  textStagger: 80,
  /** The sticker lands on the plan… */
  stickerAt: 2250,
  /** …then the reviews come in… */
  reviewsAt: 2450,
  /** …each in this time. */
  cardDuration: 500,
} as const;
