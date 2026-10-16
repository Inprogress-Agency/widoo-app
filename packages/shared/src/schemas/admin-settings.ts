import { z } from 'zod';
import { plainText } from './common';

/** Groups of the settings page (A-11), in the order it shows them. */
export const settingGroups = [
  'premium',
  'submission',
  'certification',
  'search',
  'recommendation',
] as const;
export type SettingGroup = (typeof settingGroups)[number];

/**
 * A setting is a whole count, a decimal number, or the weights of the recommendation (an object
 * of numbers, one per component).
 */
export const settingKinds = ['integer', 'decimal', 'weights'] as const;
export type SettingKind = (typeof settingKinds)[number];

export const SettingValue = z.union([z.number(), z.record(z.string(), z.number())]);
export type SettingValue = z.infer<typeof SettingValue>;

/**
 * A setting as the team reads it (A-11): the value in force, which is the default while no valid
 * row is stored, and the bounds the API holds it to. Labels and explanations belong to the admin.
 */
export const AdminSetting = z.object({
  /** Key of the `settings` row: `premium.min_steps`. */
  key: z.string(),
  group: z.enum(settingGroups),
  kind: z.enum(settingKinds),
  /** Bounds of a number, or of each weight; null when the setting has no upper bound. */
  min: z.number(),
  max: z.number().nullable(),
  default: SettingValue,
  value: SettingValue,
  /** True when a valid row of `settings` holds the value; false when the default applies. */
  isCustom: z.boolean(),
  /** When the row was last changed; null without a row. */
  updatedAt: z.iso.datetime().nullable(),
});
export type AdminSetting = z.infer<typeof AdminSetting>;

/** Body of `GET /admin/settings`. */
export const AdminSettings = z.object({ items: z.array(AdminSetting) });
export type AdminSettings = z.infer<typeof AdminSettings>;

/** Body of `PATCH /admin/settings/:key`: the new value, and why, kept in the journal. */
export const UpdateSettingBody = z.strictObject({
  value: SettingValue,
  reason: plainText(500),
});
export type UpdateSettingBody = z.infer<typeof UpdateSettingBody>;
