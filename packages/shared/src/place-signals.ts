/**
 * Confirmations and reports of a place by its visitors (wiki Creation-et-Moderation ›
 * Vérification communautaire, D-036, D-056, D-057): the rules the API applies when it records
 * one, with values read from `settings`, the wiki's by default. Keys only: the labels of the
 * reasons belong to `labels`.
 */
import { z } from 'zod';
import type { SignalReason, VerificationStatus } from './taxonomies';

/** « Tout allait bien ici ? Oui » confirms the place; « Signaler » reports what changed. */
export const placeSignalKinds = ['confirm', 'report'] as const;
export type PlaceSignalKind = (typeof placeSignalKinds)[number];

/** « Autre » alone takes a text, required: read by the team in A-03, never published (D-036). */
export const placeSignalCommentReason = 'other' satisfies SignalReason;
export const placeSignalCommentMaxLength = 80;

/**
 * Field alerts (D-036): they warn the next visitors for a while and never count toward `flagged`.
 * `closed_today` holds until midnight in the city of the place.
 */
export const fieldAlertReasons = [
  'closed_today',
  'works',
  'crowded',
] as const satisfies readonly SignalReason[];

/** Reasons that say the place is closed: « Signalé fermé » on the sheet (E-05, E-07). */
export const closureReasons = [
  'closed_today',
  'closed_temporarily',
  'closed_permanently',
] as const satisfies readonly SignalReason[];

/** Signals one account sends in 24 hours (wiki Securite-et-RGPD › Limitation de débit). */
export const placeSignalDailyLimit = 30;

/** Where the visitor was (D-056): at the step during the Go (E-07), or after the outing (E-15). */
export type PlaceSignalContext = 'on_site' | 'after_outing';

/** Key of the `settings` row of each rule of the verification; a value is a JSON number. */
export const verificationSettingKeys = {
  confirmationsToVerify: 'verification.confirmations_to_verify',
  reportsToFlag: 'verification.reports_to_flag',
  reportWindowDays: 'verification.report_window_days',
  staleAfterDays: 'verification.stale_after_days',
  signalIntervalDays: 'verification.signal_interval_days',
  onSiteWeight: 'verification.weight_on_site',
  afterOutingWeight: 'verification.weight_after_outing',
  newAccountWeight: 'verification.weight_new_account',
  newAccountHours: 'verification.new_account_hours',
  rejectionsToIgnore: 'verification.rejections_to_ignore',
  ignoreDays: 'verification.ignore_days',
} as const;

const Count = z.int().positive();
const Weight = z.number().min(0).max(10);

export const VerificationRules = z.object({
  /** Weighted confirmations since the last verification that verify the place again. */
  confirmationsToVerify: z.number().positive(),
  /** Distinct accounts reporting the same reason within the window: the place is flagged. */
  reportsToFlag: Count,
  reportWindowDays: Count,
  /** A verification older than this turns `verified` into `stale`. */
  staleAfterDays: Count,
  /** One signal per account and per place counts over this many days (D-057). */
  signalIntervalDays: Count,
  onSiteWeight: Weight,
  afterOutingWeight: Weight,
  /** Weight of an account younger than `newAccountHours`, whatever the context. */
  newAccountWeight: Weight,
  newAccountHours: Count,
  /** Reports of an account rejected by the team from which its signals are ignored. */
  rejectionsToIgnore: Count,
  ignoreDays: Count,
});
export type VerificationRules = z.infer<typeof VerificationRules>;

/** The values of the wiki (Creation-et-Moderation › Vérification communautaire). */
export const defaultVerificationRules: VerificationRules = {
  confirmationsToVerify: 3,
  reportsToFlag: 2,
  reportWindowDays: 30,
  staleAfterDays: 90,
  signalIntervalDays: 7,
  onSiteWeight: 2,
  afterOutingWeight: 1.5,
  newAccountWeight: 0.5,
  newAccountHours: 24,
  rejectionsToIgnore: 3,
  ignoreDays: 90,
};

const ruleNames = Object.keys(verificationSettingKeys) as (keyof VerificationRules)[];

/**
 * Rules from the `settings` values by key: each missing or invalid value falls back to its default
 * on its own, so that a typo in one row never disables the verification.
 */
export function verificationRulesOf(values: Readonly<Record<string, unknown>>): VerificationRules {
  const entries = ruleNames.map((rule) => {
    const parsed = VerificationRules.shape[rule].safeParse(values[verificationSettingKeys[rule]]);
    return [rule, parsed.success ? parsed.data : defaultVerificationRules[rule]];
  });
  return Object.fromEntries(entries) as VerificationRules;
}

const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;

/** `days` days before `now`: the start of a window of the rules. */
export const daysBefore = (now: Date, days: number) => new Date(now.getTime() - days * dayMs);

/**
 * Weight of a signal, set when it is recorded: on site or after the outing, the weight of a young
 * account instead whatever the context, times the trust score of the account (`users.trust_score`).
 */
export function placeSignalWeightOf(
  signal: { context: PlaceSignalContext; accountCreatedAt: Date; trustScore: number },
  now: Date,
  rules: VerificationRules,
): number {
  const ageMs = now.getTime() - signal.accountCreatedAt.getTime();
  const base =
    ageMs < rules.newAccountHours * hourMs
      ? rules.newAccountWeight
      : signal.context === 'on_site'
        ? rules.onSiteWeight
        : rules.afterOutingWeight;
  return base * Math.max(0, signal.trustScore);
}

/**
 * Whether the signals of an account are ignored at `now` (journalised, never told): once enough of
 * its reports were rejected by the team, until `ignoreDays` after the last rejection.
 */
export function areSignalsIgnored(
  rejections: { count: number; lastAt: Date | null },
  now: Date,
  rules: VerificationRules,
): boolean {
  return (
    rejections.count >= rules.rejectionsToIgnore &&
    rejections.lastAt !== null &&
    rejections.lastAt > daysBefore(now, rules.ignoreDays)
  );
}

/** Statuses only the team changes (A-03): the visitors' signals are kept, the place waits. */
const decidedByTeam: readonly VerificationStatus[] = ['flagged', 'closed'];

/**
 * A counted confirmation of `weight`: the weighted counter grows and, at the threshold, the place
 * is verified again, its counter back to zero. Null for a place that waits for the team.
 */
export function afterConfirmation(
  place: { status: VerificationStatus; confirmationsSinceVerified: number },
  weight: number,
  rules: VerificationRules,
): { status: VerificationStatus; confirmationsSinceVerified: number; isVerified: boolean } | null {
  if (decidedByTeam.includes(place.status)) return null;
  const confirmations = place.confirmationsSinceVerified + weight;
  return confirmations >= rules.confirmationsToVerify
    ? { status: 'verified', confirmationsSinceVerified: 0, isVerified: true }
    : { status: place.status, confirmationsSinceVerified: confirmations, isVerified: false };
}

/** Whether a report of `reason` counts toward `flagged`: never a field alert. */
export const countsTowardFlag = (reason: SignalReason) =>
  !(fieldAlertReasons as readonly SignalReason[]).includes(reason);

/**
 * Whether a counted report flags its place: distinct accounts reporting the same reason since the
 * window and the last verification (`concordantAccounts`, this one included) reach the threshold,
 * or `closed_permanently` comes from an account that completed a Go through the place.
 */
export function flagsPlace(
  report: { reason: SignalReason; concordantAccounts: number; hasCompletedGoThere: boolean },
  status: VerificationStatus,
  rules: VerificationRules,
): boolean {
  if (decidedByTeam.includes(status) || !countsTowardFlag(report.reason)) return false;
  return (
    report.concordantAccounts >= rules.reportsToFlag ||
    (report.reason === 'closed_permanently' && report.hasCompletedGoThere)
  );
}
