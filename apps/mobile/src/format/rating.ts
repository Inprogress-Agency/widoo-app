const ratingFormat = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** « 4,9 »: one decimal, French comma. */
export const formatRating = (average: number) => ratingFormat.format(average);
