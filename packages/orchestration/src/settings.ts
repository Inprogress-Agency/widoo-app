/**
 * Thresholds of the coherence rules as the team sets them in `settings`, without a deployment
 * (Orchestration › Règles de cohérence, D-032): one key per threshold.
 */
import { bucketSettingKeys, bucketThresholdsOf, type BucketThresholds } from '@widoo/shared';
import { defaultCoherenceThresholds, type CoherenceThresholds } from './evaluate';

type Threshold = keyof CoherenceThresholds;

/** Key of the `settings` row of each threshold. */
export const coherenceSettingKeys: Record<Threshold, string> = {
  minSteps: 'coherence.min_steps',
  maxSteps: 'coherence.max_steps',
  stepMinDurationMin: 'coherence.step_min_duration_min',
  stepMaxDurationMin: 'coherence.step_max_duration_min',
  walkTransitionMaxMin: 'coherence.walk_transition_max_min',
  otherTransitionMaxMin: 'coherence.other_transition_max_min',
  totalMaxMin: 'coherence.total_max_min',
  travelShareMax: 'coherence.travel_share_max',
  descriptionMinLength: 'coherence.description_min_length',
  backAndForthMax: 'coherence.back_and_forth_max',
};

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;
const isPositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/** What a stored value must be: a whole count, minutes above zero, or a share above zero. */
const validOf: Record<Threshold, (value: unknown) => value is number> = {
  minSteps: isCount,
  maxSteps: isCount,
  stepMinDurationMin: isCount,
  stepMaxDurationMin: isPositive,
  walkTransitionMaxMin: isPositive,
  otherTransitionMaxMin: isPositive,
  totalMaxMin: isPositive,
  travelShareMax: (value): value is number => isPositive(value) && value <= 1,
  descriptionMinLength: isCount,
  backAndForthMax: isPositive,
};

/** Bounds that go by pair: a pair that no longer holds falls back to the defaults as a whole. */
const pairs: [Threshold, Threshold][] = [
  ['minSteps', 'maxSteps'],
  ['stepMinDurationMin', 'stepMaxDurationMin'],
];

/**
 * Thresholds from the `settings` values by key: a missing or invalid value falls back to its
 * default on its own, so that a typo in one row never disables a rule.
 */
export function coherenceThresholdsOf(
  values: Readonly<Record<string, unknown>>,
): CoherenceThresholds {
  const thresholds = { ...defaultCoherenceThresholds };
  for (const threshold of Object.keys(coherenceSettingKeys) as Threshold[]) {
    const value = values[coherenceSettingKeys[threshold]];
    if (validOf[threshold](value)) thresholds[threshold] = value;
  }
  for (const [low, high] of pairs) {
    if (thresholds[low] > thresholds[high]) {
      thresholds[low] = defaultCoherenceThresholds[low];
      thresholds[high] = defaultCoherenceThresholds[high];
    }
  }
  return thresholds;
}

/** Every `settings` key the engine reads: the thresholds of the rules and the bucket bounds. */
export const orchestrationSettingKeys: readonly string[] = [
  ...Object.values(coherenceSettingKeys),
  ...Object.values(bucketSettingKeys),
];

/** What `computeRoute` reads from `settings`, each value missing or invalid on its default. */
export interface OrchestrationSettings {
  thresholds: CoherenceThresholds;
  buckets: BucketThresholds;
}

/** The thresholds and buckets of the engine from the `settings` values by key. */
export function orchestrationSettingsOf(
  values: Readonly<Record<string, unknown>>,
): OrchestrationSettings {
  return { thresholds: coherenceThresholdsOf(values), buckets: bucketThresholdsOf(values) };
}
