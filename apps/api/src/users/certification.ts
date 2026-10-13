import {
  certificationSettingKeys,
  certificationThresholdsOf,
  type CertificationThresholds,
} from '@widoo/shared';
import type { Db } from '../db/client';
import { createCachedSetting, readSettings } from '../search/settings';

/**
 * Thresholds of the Créateur certifié badge (D-023), read from `settings` and kept one minute
 * per process: the team changes them without a deployment. For the nightly computation (#127),
 * `/me`, `/config` and the public profile (#38, #65).
 */
export function createCertificationThresholds(
  db: Db,
  now: () => number = () => Date.now(),
): () => Promise<CertificationThresholds> {
  return createCachedSetting(
    () => readSettings(db, Object.values(certificationSettingKeys)),
    certificationThresholdsOf,
    now,
  );
}
