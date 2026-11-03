import {
  daysBefore,
  verificationRulesOf,
  verificationSettingKeys,
  type VerificationRules,
} from '@widoo/shared';
import { and, eq, inArray, isNull, lt, or } from 'drizzle-orm';
import type { Db } from '../db/client';
import { places } from '../db/schema';
import { readSettings } from '../search/settings';

/**
 * Nightly decay of the verifications (`POST /internal/verification-decay`, wiki
 * Creation-et-Moderation › État d'un lieu): a place verified longer ago than the rules allow, or
 * without a date, becomes `stale`; the sheet then says « Dernière vérification il y a N mois »
 * (E-05, D-056). Every place, or the given ones. Flagged and closed places wait for the team.
 */
export async function decayVerifications(
  db: Db,
  options: { now: Date; rules: VerificationRules; placeIds?: readonly string[] },
): Promise<{ updated: number }> {
  if (options.placeIds?.length === 0) return { updated: 0 };
  const cutoff = daysBefore(options.now, options.rules.staleAfterDays);
  const decayed = await db
    .update(places)
    .set({ verificationStatus: 'stale' })
    .where(
      and(
        eq(places.verificationStatus, 'verified'),
        or(isNull(places.verifiedAt), lt(places.verifiedAt, cutoff)),
        options.placeIds ? inArray(places.id, [...options.placeIds]) : undefined,
      ),
    )
    .returning({ id: places.id });
  return { updated: decayed.length };
}

/** The job as Cloud Scheduler runs it: the rules of `settings` read once, every place. */
export async function decayAllVerifications(db: Db, now: Date): Promise<{ updated: number }> {
  const rules = verificationRulesOf(await readSettings(db, Object.values(verificationSettingKeys)));
  return decayVerifications(db, { now, rules });
}
