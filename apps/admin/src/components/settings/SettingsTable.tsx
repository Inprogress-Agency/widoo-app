import { formatSettingValue } from '@/lib/setting-display';
import { messages } from '@/messages/fr';
import { settingGroups, type AdminSetting } from '@widoo/shared';
import { StatusBadge, Table, TableCell, TableHeaderCell, TableRow, TableSkeleton } from '@widoo/ui';

const texts = messages.settings;
const columnCount = 3;

type SettingsTableProps = {
  /** The settings, in the order of the page; ignored while `isLoading`. */
  items: AdminSetting[];
  isLoading: boolean;
  /** The setting whose detail is open in the panel. */
  openKey: string | null;
  onOpen: (setting: AdminSetting) => void;
};

/** The settings as a table grouped by theme (A-11); a row opens its detail. */
export function SettingsTable({ items, isLoading, openKey, onOpen }: SettingsTableProps) {
  return (
    <Table>
      <thead>
        <tr>
          <TableHeaderCell>{texts.columns.setting}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.value}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.state}</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <TableSkeleton rows={7} columns={columnCount} label={messages.list.loading} />
        ) : (
          settingGroups.flatMap((group) => {
            const inGroup = items.filter((setting) => setting.group === group);
            if (inGroup.length === 0) {
              return [];
            }
            return [
              <tr key={group}>
                <td colSpan={columnCount} className="pb-4 pt-16 text-label-strong">
                  {texts.groups[group]}
                </td>
              </tr>,
              ...inGroup.map((setting) => (
                <TableRow
                  key={setting.key}
                  onOpen={() => onOpen(setting)}
                  isOpen={setting.key === openKey}
                >
                  <TableCell className="py-8">
                    <span className="flex flex-col">
                      <span className="text-control">{texts.items[setting.key]?.label}</span>
                      <span className="text-label text-muted-foreground">
                        {texts.items[setting.key]?.explanation}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>{formatSettingValue(setting, setting.value)}</TableCell>
                  <TableCell>
                    <StatusBadge tone={setting.isCustom ? 'info' : 'neutral'}>
                      {setting.isCustom ? texts.state.custom : texts.state.default}
                    </StatusBadge>
                  </TableCell>
                </TableRow>
              )),
            ];
          })
        )}
      </tbody>
    </Table>
  );
}
