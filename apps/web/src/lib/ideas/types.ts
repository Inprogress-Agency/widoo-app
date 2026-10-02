/** The five moods of « Des idées de sortie pour chaque envie » (E-21), in the order of the page. */
export const ideaKeys = ['romantic', 'friends', 'freeFamily', 'rainy', 'fullDay'] as const;

export type IdeaKey = (typeof ideaKeys)[number];

/**
 * Example route shown under a mood (E-21 › Envies), chosen by the team and read from the API
 * (#239): only what the card shows, and its id for the link to its page `/r/`.
 */
export type ExampleRoute = {
  id: string;
  title: string;
  durationMin: number;
  /** Exact sum; rounded at display (D-032). */
  budgetPerPersonEur: number;
  /** Null until the first review: the rating is then hidden. */
  rating: { average: number; count: number } | null;
  author: { kind: 'widoo' } | { kind: 'member'; firstName: string };
};

/** Example route of each mood; a mood without one shows its photo and text only. */
export type IdeaRoutes = Partial<Record<IdeaKey, ExampleRoute>>;
