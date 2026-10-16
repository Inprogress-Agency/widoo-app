import { actionLabelOf } from '@/lib/action-display';
import { formatFullDate, formatRelativeDate } from '@/lib/dates';
import { boundsOf, formatSettingValue } from '@/lib/setting-display';
import { messages } from '@/messages/fr';
import type { AdminActionItem, AdminSetting, SettingValue } from '@widoo/shared';
import type { ReactNode } from 'react';

const texts = messages.settings.panel;

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-12 text-body-s">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-right">{children}</dd>
    </div>
  );
}

/** The value a journal line kept in its `before` or `after`, or null when it has none. */
function valueOfState(state: unknown): SettingValue | null {
  if (typeof state !== 'object' || state === null || !('value' in state)) {
    return null;
  }
  const { value } = state;
  return typeof value === 'number' || (typeof value === 'object' && value !== null)
    ? (value as SettingValue)
    : null;
}

type SettingPanelContentProps = {
  setting: AdminSetting;
  /** The lines of the journal about this setting, newest first; null while they load. */
  history: AdminActionItem[] | null;
  hasHistoryError: boolean;
};

/** A setting in the detail panel (A-11): its value, default and bounds, and who changed it. */
export function SettingPanelContent({
  setting,
  history,
  hasHistoryError,
}: SettingPanelContentProps) {
  const written = (value: SettingValue | null) =>
    value === null ? '?' : formatSettingValue(setting, value);
  return (
    <div className="flex flex-col gap-16">
      <p className="text-body-s text-muted-foreground">
        {messages.settings.items[setting.key]?.explanation}
      </p>
      <dl className="flex flex-col gap-8">
        <Line label={texts.value}>{formatSettingValue(setting, setting.value)}</Line>
        <Line label={texts.default}>{formatSettingValue(setting, setting.default)}</Line>
        <Line label={texts.bounds}>{boundsOf(setting)}</Line>
        <Line label={texts.updated}>
          {setting.updatedAt ? formatFullDate(new Date(setting.updatedAt)) : texts.never}
        </Line>
      </dl>
      <section className="flex flex-col gap-8">
        <h3 className="text-label-strong">{texts.history}</h3>
        {hasHistoryError ? (
          <p className="text-body-s text-muted-foreground">{texts.historyError}</p>
        ) : history === null ? null : history.length === 0 ? (
          <p className="text-body-s text-muted-foreground">{texts.noHistory}</p>
        ) : (
          <ul className="flex flex-col gap-12">
            {history.map((line) => (
              <li key={line.id} className="flex flex-col text-body-s">
                <span>
                  {texts.change(
                    written(valueOfState(line.before)),
                    written(valueOfState(line.after)),
                  )}
                </span>
                <span className="text-label text-muted-foreground">
                  {actionLabelOf(line.action)} ·{' '}
                  {line.actor?.name ?? messages.actionLog.unknownActor} ·{' '}
                  {formatRelativeDate(new Date(line.createdAt))}
                </span>
                {line.reason ? (
                  <span className="text-label text-muted-foreground">{line.reason}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
