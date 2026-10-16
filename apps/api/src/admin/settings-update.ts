import type { AdminSetting, UpdateSettingBody } from '@widoo/shared';
import type { Db } from '../db/client';
import { settings } from '../db/schema';
import { httpError } from '../errors';
import { recordAdminAction } from './actions';
import { definitionOf, isValidSettingValue, readAdminSetting } from './settings-catalog';

/**
 * Changes a setting (A-11, admin only): the value is checked against the bounds of its key, then
 * written with its journal entry (before, after and the reason) in one transaction. The API reads
 * `settings` again within a minute at most, so the change applies without a deployment. A key the
 * admin does not manage answers 404, a value out of bounds 400.
 */
export async function updateSetting(
  db: Db,
  actorId: string,
  key: string,
  body: UpdateSettingBody,
  now = new Date(),
): Promise<AdminSetting> {
  const definition = definitionOf(key);
  if (!definition) {
    throw httpError(404, 'Setting not found');
  }
  if (!isValidSettingValue(definition, body.value)) {
    throw httpError(400, 'The value is out of the bounds of this setting');
  }
  return db.transaction(async (tx) => {
    const before = await readAdminSetting(tx, key);
    await tx
      .insert(settings)
      .values({ key, value: body.value, updatedAt: now })
      .onConflictDoUpdate({ target: settings.key, set: { value: body.value, updatedAt: now } });
    await recordAdminAction(tx, {
      actorId,
      action: 'setting.update',
      targetType: 'setting',
      targetId: key,
      before: { value: before?.value, isCustom: before?.isCustom },
      after: { value: body.value },
      reason: body.reason,
    });
    const after = await readAdminSetting(tx, key);
    if (!after) {
      throw httpError(404, 'Setting not found');
    }
    return after;
  });
}
