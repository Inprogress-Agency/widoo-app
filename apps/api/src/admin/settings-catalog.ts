import {
  defaultCertificationThresholds,
  defaultMaxPendingRoutes,
  defaultPremiumMinSteps,
  maxPendingRoutesKey,
  certificationSettingKeys,
  type AdminSetting,
  type SettingGroup,
  type SettingKind,
  type SettingValue,
} from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/client';
import { settings } from '../db/schema';
import { premiumMinStepsKey } from '../moderation/detail';
import { componentNames, defaultWeights, weightsKey, weightsOf } from '../recommendation/weights';
import { clusterAreaKey, defaultClusterAreaKm2 } from '../search/settings';

type Definition = {
  key: string;
  group: SettingGroup;
  kind: SettingKind;
  min: number;
  /** Null when the code puts no upper bound on it. */
  max: number | null;
  default: SettingValue;
};

/**
 * The settings the team may change in A-11: the ones the API reads from `settings` and applies
 * (a key no code reads would change nothing). Bounds are those of the code where it has some,
 * otherwise a generous bound against a typo. The order is the one of the page.
 */
export const settingDefinitions: readonly Definition[] = [
  {
    key: premiumMinStepsKey,
    group: 'premium',
    kind: 'integer',
    min: 1,
    max: 20,
    default: defaultPremiumMinSteps,
  },
  {
    key: maxPendingRoutesKey,
    group: 'submission',
    kind: 'integer',
    min: 1,
    max: 20,
    default: defaultMaxPendingRoutes,
  },
  {
    key: certificationSettingKeys.minVerifiedRoutes,
    group: 'certification',
    kind: 'integer',
    min: 0,
    max: 100,
    default: defaultCertificationThresholds.minVerifiedRoutes,
  },
  {
    key: certificationSettingKeys.minRating,
    group: 'certification',
    kind: 'decimal',
    min: 0,
    max: 5,
    default: defaultCertificationThresholds.minRating,
  },
  {
    key: certificationSettingKeys.minCompletedRoutes,
    group: 'certification',
    kind: 'integer',
    min: 0,
    max: 100,
    default: defaultCertificationThresholds.minCompletedRoutes,
  },
  {
    key: clusterAreaKey,
    group: 'search',
    kind: 'decimal',
    min: 0.1,
    max: 10_000,
    default: defaultClusterAreaKm2,
  },
  {
    key: weightsKey,
    group: 'recommendation',
    kind: 'weights',
    min: 0,
    max: 10,
    default: defaultWeights,
  },
];

/** The definition of a key, undefined for a key the admin does not manage. */
export function definitionOf(key: string): Definition | undefined {
  return settingDefinitions.find((definition) => definition.key === key);
}

const isNumberWithin = (value: unknown, definition: Definition): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= definition.min &&
  (definition.max === null || value <= definition.max) &&
  (definition.kind !== 'integer' || Number.isInteger(value));

/**
 * Whether `value` is one the setting accepts: a number within its bounds (whole for a count), or
 * weights that name known components only, each within the bounds, not all zero.
 */
export function isValidSettingValue(definition: Definition, value: unknown): value is SettingValue {
  if (definition.kind !== 'weights') {
    return isNumberWithin(value, definition);
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const entries = Object.entries(value);
  const known = (name: string) => (componentNames as readonly string[]).includes(name);
  return (
    entries.length > 0 &&
    entries.every(([name, weight]) => known(name) && isNumberWithin(weight, definition)) &&
    entries.some(([, weight]) => weight > 0)
  );
}

/** The value in force: the stored one when valid, the default otherwise (weights over defaults). */
export function effectiveValueOf(definition: Definition, stored: unknown): SettingValue {
  if (!isValidSettingValue(definition, stored)) {
    return definition.default;
  }
  return definition.kind === 'weights' ? weightsOf(stored) : stored;
}

type StoredRow = { value: unknown; updatedAt: Date };

const toAdminSetting = (definition: Definition, row: StoredRow | undefined): AdminSetting => {
  const isCustom = row !== undefined && isValidSettingValue(definition, row.value);
  return {
    ...definition,
    value: effectiveValueOf(definition, row?.value),
    isCustom,
    updatedAt: isCustom ? row.updatedAt.toISOString() : null,
  };
};

/** The settings of A-11 with the value in force and whether the team changed it. */
export async function readAdminSettings(db: Db): Promise<AdminSetting[]> {
  const rows = await db
    .select({ key: settings.key, value: settings.value, updatedAt: settings.updatedAt })
    .from(settings)
    .where(
      inArray(
        settings.key,
        settingDefinitions.map((definition) => definition.key),
      ),
    );
  const byKey = new Map(rows.map((row) => [row.key, row]));
  return settingDefinitions.map((definition) =>
    toAdminSetting(definition, byKey.get(definition.key)),
  );
}

/** One setting of A-11, undefined for a key the admin does not manage. */
export async function readAdminSetting(
  db: Pick<Db, 'select'>,
  key: string,
): Promise<AdminSetting | undefined> {
  const definition = definitionOf(key);
  if (!definition) {
    return undefined;
  }
  const [row] = await db
    .select({ value: settings.value, updatedAt: settings.updatedAt })
    .from(settings)
    .where(eq(settings.key, key));
  return toAdminSetting(definition, row);
}
