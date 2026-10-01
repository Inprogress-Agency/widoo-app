/**
 * A review of the app quoted on the site (E-21 › Avis de la hero): only a real review, copied word
 * for word, with the agreement of its author; never an invented one.
 */
export type AppReview = {
  rating: number;
  text: string;
  firstName: string;
  /** ISO date of the review. */
  date: string;
  store: 'appStore' | 'googlePlay';
};
