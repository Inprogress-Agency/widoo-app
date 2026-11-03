import {
  verificationRulesOf,
  verificationSettingKeys,
  type VerificationRules,
} from '@widoo/shared';
import type { Db } from '../db/client';
import { createCachedSetting, readSettings } from '../search/settings';

/**
 * Rules of the place verification (weights, thresholds, windows), read from `settings` and kept
 * one minute per process: the team changes them without a deployment, a missing or invalid value
 * keeps the wiki's.
 */
export function createVerificationRules(
  db: Db,
  now: () => number = () => Date.now(),
): () => Promise<VerificationRules> {
  return createCachedSetting(
    () => readSettings(db, Object.values(verificationSettingKeys)),
    verificationRulesOf,
    now,
  );
}
