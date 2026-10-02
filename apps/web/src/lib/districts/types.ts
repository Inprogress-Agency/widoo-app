/** The districts of « Balades à Paris, quartier par quartier » (E-21), by bank, in reading order. */
export const districtsByBank = {
  right: ['montmartre', 'buttesChaumont', 'canalSaintMartin', 'passages', 'marais'],
  left: ['saintGermain', 'latinQuarter'],
} as const;

export type Bank = keyof typeof districtsByBank;

export type DistrictKey = (typeof districtsByBank)[Bank][number];

/**
 * Example route of each district, chosen by the team and read from the API (#239): its id, for
 * the link of the card to its page `/r/`. A district without one shows its card without link.
 */
export type DistrictRoutes = Partial<Record<DistrictKey, string>>;
